"""
DataProcessor: Loads and analyzes LTE (4G) and UMTS (3G) drive test datasets.
Applies KPI thresholds from Seuil_KPI reference image.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Optional, List, Any
import json


# ─────────────────────────────────────────────
# KPI THRESHOLDS (from Seuil_KPI.png)
# ─────────────────────────────────────────────
RSRP_THRESHOLDS = {
    "Très bonne":  (-80,    None),    # >= -80
    "Bonne":       (-90,    -80),     # -90 to -80
    "Moyenne":     (-100,   -90),     # -100 to -90
    "Mauvaise":    (-130,   -100),    # -130 to -100
}

RSRQ_THRESHOLDS = {
    "Très bonne":  (-5,     None),    # >= -5
    "Acceptable":  (-10,    -5),      # -10 to -5
    "Assez bien":  (-14,    -10),     # -14 to -10
    "Mauvaise":    (None,   -14),     # <= -14
}

THROUGHPUT_THRESHOLDS = {
    "Très bonne":  (30,     None),    # >= 30 Mbps
    "Acceptable":  (25,     30),      # 25-30
    "Assez bien":  (20,     25),      # 20-25
    "Mauvaise":    (10,     20),      # 10-20
    "Inexistant":  (0,      10),      # < 10
}

# 3G UMTS thresholds (standard values)
RSCP_THRESHOLDS = {
    "Très bonne":  (-75,    None),
    "Bonne":       (-85,    -75),
    "Moyenne":     (-95,    -85),
    "Mauvaise":    (None,   -95),
}

ECNO_THRESHOLDS = {
    "Très bonne":  (-6,     None),
    "Bonne":       (-10,    -6),
    "Moyenne":     (-15,    -10),
    "Mauvaise":    (None,   -15),
}

# Color mapping for each level
LEVEL_COLORS = {
    "Très bonne":  "#2196F3",   # blue
    "Bonne":       "#9E9E9E",   # grey
    "Moyenne":     "#FFEB3B",   # yellow
    "Mauvaise":    "#FF5722",   # orange-red
    "Acceptable":  "#4CAF50",   # green
    "Assez bien":  "#03A9F4",   # light blue
    "Inexistant":  "#F44336",   # red
}


def classify_value(value, thresholds: dict) -> str:
    """Classify a numeric value according to threshold dict."""
    if pd.isna(value):
        return "N/A"
    for level, (low, high) in thresholds.items():
        if low is None and high is not None:
            if value <= high:
                return level
        elif high is None and low is not None:
            if value >= low:
                return level
        elif low is not None and high is not None:
            if low <= value < high:
                return level
    return "N/A"


class DataProcessor:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.datasets: Dict[str, Dict] = {}

    # ─────────────────────────────────────────
    # LOADING
    # ─────────────────────────────────────────

    def load_default_datasets(self):
        """Load DT1 (LTE), DT2 and DT3 (UMTS) on startup."""
        files = {
            "DT1 - LTE 4G": self.data_dir / "DT1.xlsx",
            "DT2 - UMTS 3G": self.data_dir / "DT2.csv",
            "DT3 - UMTS 3G": self.data_dir / "DT3.csv",
        }
        for name, path in files.items():
            if path.exists():
                result = self.load_file(path, name)
                if result["success"]:
                    print(f"  ✅ {name}: {result['rows']} rows")
                else:
                    print(f"  ❌ {name}: {result['error']}")

    def load_file(self, path: Path, name: str = None) -> dict:
        """Load a drive test file, detect type, parse, classify KPIs."""
        try:
            name = name or path.stem
            ext = path.suffix.lower()

            if ext == ".xlsx":
                df, tech = self._parse_lte_xlsx(path)
            elif ext == ".csv":
                df, tech = self._parse_umts_csv(path)
            else:
                return {"success": False, "error": "Unsupported format"}

            df = self._classify_kpis(df, tech)
            self.datasets[name] = {
                "df": df,
                "tech": tech,
                "path": str(path),
                "name": name,
            }
            return {"success": True, "name": name, "rows": len(df), "tech": tech}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _parse_lte_xlsx(self, path: Path):
        """Parse LTE 4G XLSX file."""
        from openpyxl import load_workbook
        wb = load_workbook(path, read_only=True)
        ws = wb.active
        data = list(ws.iter_rows(values_only=True))
        header = data[0]
        rows = [r for r in data[1:] if any(v is not None for v in r)]
        df = pd.DataFrame(rows, columns=header)
        df.columns = ['Time', 'CellID', 'Band', 'RSRP', 'RSRQ', 'Throughput']

        for col in ['RSRP', 'RSRQ', 'Throughput']:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        # Forward-fill CellID and Band to merge split rows
        df['CellID'] = pd.to_numeric(df['CellID'], errors='coerce')
        df_rsrp = df.dropna(subset=['RSRP']).copy()
        df_tp = df.dropna(subset=['Throughput'])[['Time', 'Throughput']].copy()
        df_rsrp['Time_key'] = df_rsrp['Time'].astype(str).str.strip()
        df_tp['Time_key'] = df_tp['Time'].astype(str).str.strip()
        df_merged = pd.merge(df_rsrp, df_tp, on='Time_key', how='left', suffixes=('', '_tp'))
        df_merged['Throughput'] = df_merged['Throughput_tp'].fillna(df_merged['Throughput'])
        df_merged = df_merged.drop(columns=['Throughput_tp', 'Time_key', 'Time_y'], errors='ignore')
        df_merged = df_merged.rename(columns={'Time_x': 'Time'}) if 'Time_x' in df_merged.columns else df_merged
        # Convert throughput from Kbps to Mbps
        df_merged['Throughput_Mbps'] = df_merged['Throughput'] / 1000
        return df_merged.reset_index(drop=True), "LTE"

    def _parse_umts_csv(self, path: Path):
        """Parse UMTS 3G CSV file."""
        df = pd.read_csv(path, sep=";", on_bad_lines='skip')
        df.columns = ['Time', 'Band', 'Channel', 'ScramblingCode', 'RSCP', 'EcN0', 'RSCP_detected', 'SC_detected']
        # Take first active cell only (before first comma)
        for col in ['RSCP', 'EcN0']:
            df[col] = df[col].astype(str).str.split(',').str[0].str.strip()
            df[col] = pd.to_numeric(df[col], errors='coerce')
        df['Band'] = df['Band'].astype(str).str.split(',').str[0].str.strip()
        df['Channel'] = df['Channel'].astype(str).str.split(',').str[0].str.strip()
        return df.reset_index(drop=True), "UMTS"

    # ─────────────────────────────────────────
    # KPI CLASSIFICATION
    # ─────────────────────────────────────────

    def _classify_kpis(self, df: pd.DataFrame, tech: str) -> pd.DataFrame:
        if tech == "LTE":
            df['RSRP_level'] = df['RSRP'].apply(lambda v: classify_value(v, RSRP_THRESHOLDS))
            df['RSRQ_level'] = df['RSRQ'].apply(lambda v: classify_value(v, RSRQ_THRESHOLDS))
            if 'Throughput_Mbps' in df.columns:
                df['TP_level'] = df['Throughput_Mbps'].apply(lambda v: classify_value(v, THROUGHPUT_THRESHOLDS))
        elif tech == "UMTS":
            df['RSCP_level'] = df['RSCP'].apply(lambda v: classify_value(v, RSCP_THRESHOLDS))
            df['EcN0_level'] = df['EcN0'].apply(lambda v: classify_value(v, ECNO_THRESHOLDS))
        return df

    # ─────────────────────────────────────────
    # SUMMARY & STATS
    # ─────────────────────────────────────────

    def get_datasets_summary(self) -> List[Dict]:
        result = []
        for name, ds in self.datasets.items():
            df = ds["df"]
            tech = ds["tech"]
            summary = {
                "name": name,
                "tech": tech,
                "rows": len(df),
                "kpis": []
            }
            if tech == "LTE":
                for kpi, col in [("RSRP", "RSRP"), ("RSRQ", "RSRQ"), ("Throughput (Mbps)", "Throughput_Mbps")]:
                    if col in df.columns:
                        vals = df[col].dropna()
                        if len(vals):
                            summary["kpis"].append({
                                "name": kpi,
                                "mean": round(float(vals.mean()), 2),
                                "min": round(float(vals.min()), 2),
                                "max": round(float(vals.max()), 2),
                            })
            elif tech == "UMTS":
                for kpi, col in [("RSCP", "RSCP"), ("Ec/N0", "EcN0")]:
                    if col in df.columns:
                        vals = df[col].dropna()
                        if len(vals):
                            summary["kpis"].append({
                                "name": kpi,
                                "mean": round(float(vals.mean()), 2),
                                "min": round(float(vals.min()), 2),
                                "max": round(float(vals.max()), 2),
                            })
            result.append(summary)
        return result

    def get_detailed_stats(self, name: str) -> Optional[Dict]:
        if name not in self.datasets:
            return None
        ds = self.datasets[name]
        df = ds["df"]
        tech = ds["tech"]
        stats = {"name": name, "tech": tech, "total_samples": len(df)}

        if tech == "LTE":
            for kpi, col, levels in [
                ("RSRP", "RSRP", RSRP_THRESHOLDS),
                ("RSRQ", "RSRQ", RSRQ_THRESHOLDS),
                ("Throughput_Mbps", "Throughput_Mbps", THROUGHPUT_THRESHOLDS),
            ]:
                vals = df[col].dropna() if col in df.columns else pd.Series(dtype=float)
                if len(vals):
                    stats[kpi] = {
                        "mean": round(float(vals.mean()), 2),
                        "median": round(float(vals.median()), 2),
                        "std": round(float(vals.std()), 2),
                        "min": round(float(vals.min()), 2),
                        "max": round(float(vals.max()), 2),
                        "count": int(len(vals)),
                    }
        elif tech == "UMTS":
            for kpi, col in [("RSCP", "RSCP"), ("EcN0", "EcN0")]:
                vals = df[col].dropna() if col in df.columns else pd.Series(dtype=float)
                if len(vals):
                    stats[kpi] = {
                        "mean": round(float(vals.mean()), 2),
                        "median": round(float(vals.median()), 2),
                        "std": round(float(vals.std()), 2),
                        "min": round(float(vals.min()), 2),
                        "max": round(float(vals.max()), 2),
                        "count": int(len(vals)),
                    }
        return stats

    def get_kpi_distribution(self, name: str) -> Optional[Dict]:
        if name not in self.datasets:
            return None
        ds = self.datasets[name]
        df = ds["df"]
        tech = ds["tech"]
        result = {"name": name, "tech": tech, "distributions": {}}

        if tech == "LTE":
            for level_col, label in [("RSRP_level", "RSRP"), ("RSRQ_level", "RSRQ"), ("TP_level", "Throughput")]:
                if level_col in df.columns:
                    counts = df[level_col].value_counts().to_dict()
                    total = sum(v for k, v in counts.items() if k != "N/A")
                    dist = []
                    for lvl, cnt in counts.items():
                        if lvl == "N/A":
                            continue
                        dist.append({
                            "level": lvl,
                            "count": cnt,
                            "percent": round(cnt / total * 100, 1) if total else 0,
                            "color": LEVEL_COLORS.get(lvl, "#ccc")
                        })
                    result["distributions"][label] = dist
        elif tech == "UMTS":
            for level_col, label in [("RSCP_level", "RSCP"), ("EcN0_level", "Ec/N0")]:
                if level_col in df.columns:
                    counts = df[level_col].value_counts().to_dict()
                    total = sum(v for k, v in counts.items() if k != "N/A")
                    dist = []
                    for lvl, cnt in counts.items():
                        if lvl == "N/A":
                            continue
                        dist.append({
                            "level": lvl,
                            "count": cnt,
                            "percent": round(cnt / total * 100, 1) if total else 0,
                            "color": LEVEL_COLORS.get(lvl, "#ccc")
                        })
                    result["distributions"][label] = dist
        return result

    def get_timeseries(self, name: str, kpi: str, limit: int = 200) -> Optional[Dict]:
        if name not in self.datasets:
            return None
        ds = self.datasets[name]
        df = ds["df"]
        col_map = {
            "RSRP": "RSRP", "RSRQ": "RSRQ",
            "Throughput": "Throughput_Mbps",
            "RSCP": "RSCP", "EcN0": "EcN0"
        }
        col = col_map.get(kpi)
        if col not in df.columns:
            return None
        sub = df[['Time', col]].dropna(subset=[col]).head(limit)
        return {
            "kpi": kpi,
            "times": sub['Time'].astype(str).tolist(),
            "values": sub[col].round(2).tolist(),
        }

    # ─────────────────────────────────────────
    # FULL REPORT GENERATION
    # ─────────────────────────────────────────

    def generate_full_report(self, dataset_names: List[str] = None) -> Dict:
        names = dataset_names or list(self.datasets.keys())
        report = {
            "title": "Rapport d'Analyse de Qualité Réseau - Drive Test",
            "datasets": [],
            "global_summary": "",
            "recommendations": []
        }

        all_issues = []
        for name in names:
            if name not in self.datasets:
                continue
            ds = self.datasets[name]
            df = ds["df"]
            tech = ds["tech"]
            dist = self.get_kpi_distribution(name)
            stats = self.get_detailed_stats(name)
            entry = {"name": name, "tech": tech, "stats": stats, "distributions": dist["distributions"]}

            # Generate textual analysis per dataset
            issues = []
            if tech == "LTE":
                rsrp_dist = {d["level"]: d["percent"] for d in dist["distributions"].get("RSRP", [])}
                rsrq_dist = {d["level"]: d["percent"] for d in dist["distributions"].get("RSRQ", [])}
                tp_dist = {d["level"]: d["percent"] for d in dist["distributions"].get("Throughput", [])}

                bad_rsrp = rsrp_dist.get("Mauvaise", 0) + rsrp_dist.get("Moyenne", 0)
                bad_rsrq = rsrq_dist.get("Mauvaise", 0) + rsrq_dist.get("Assez bien", 0)
                bad_tp = tp_dist.get("Mauvaise", 0) + tp_dist.get("Inexistant", 0)

                if bad_rsrp > 30:
                    issues.append(f"⚠️ Couverture LTE insuffisante : {bad_rsrp:.1f}% des mesures RSRP en zone Mauvaise/Moyenne")
                if bad_rsrq > 25:
                    issues.append(f"⚠️ Qualité du signal LTE dégradée : {bad_rsrq:.1f}% des mesures RSRQ en qualité faible")
                if bad_tp > 20:
                    issues.append(f"⚠️ Débit DL insuffisant : {bad_tp:.1f}% des mesures en débit Mauvais/Inexistant")

                mean_rsrp = stats.get("RSRP", {}).get("mean", 0)
                if mean_rsrp < -90:
                    issues.append("🔴 RSRP moyen critique (< -90 dBm) — zones de mauvaise couverture dominantes")
                elif mean_rsrp < -80:
                    issues.append("🟡 RSRP moyen acceptable (entre -90 et -80 dBm) — amélioration possible")
                else:
                    issues.append("🟢 RSRP moyen satisfaisant (>= -80 dBm)")

            elif tech == "UMTS":
                rscp_dist = {d["level"]: d["percent"] for d in dist["distributions"].get("RSCP", [])}
                ecno_dist = {d["level"]: d["percent"] for d in dist["distributions"].get("Ec/N0", [])}

                bad_rscp = rscp_dist.get("Mauvaise", 0) + rscp_dist.get("Moyenne", 0)
                bad_ecno = ecno_dist.get("Mauvaise", 0) + ecno_dist.get("Moyenne", 0)

                if bad_rscp > 30:
                    issues.append(f"⚠️ Couverture UMTS insuffisante : {bad_rscp:.1f}% des mesures RSCP dégradées")
                if bad_ecno > 30:
                    issues.append(f"⚠️ Qualité Ec/N0 dégradée : {bad_ecno:.1f}% des mesures en zone faible")

            entry["issues"] = issues
            all_issues.extend(issues)
            report["datasets"].append(entry)

        # Global recommendations
        recs = self._generate_recommendations(all_issues)
        report["recommendations"] = recs
        report["global_summary"] = f"Analyse de {len(names)} campagnes drive test. {len(all_issues)} problèmes identifiés."

        return report

    def _generate_recommendations(self, issues: List[str]) -> List[Dict]:
        recs = []
        issue_text = " ".join(issues).lower()

        if "rsrp" in issue_text and ("mauvaise" in issue_text or "critique" in issue_text):
            recs.append({
                "priority": "Haute",
                "category": "Couverture",
                "title": "Optimisation de la puissance d'émission eNB",
                "detail": "Augmenter la puissance d'émission ou ajouter des sites LTE dans les zones de couverture faible (RSRP < -100 dBm). Envisager des antennes à gain élevé."
            })

        if "rsrq" in issue_text or "qualité" in issue_text:
            recs.append({
                "priority": "Haute",
                "category": "Qualité signal",
                "title": "Réduction des interférences LTE",
                "detail": "Auditer la configuration des paramètres PCI (Physical Cell Identity) pour éviter les collisions. Activer le ICIC (Inter-Cell Interference Coordination)."
            })

        if "débit" in issue_text or "throughput" in issue_text:
            recs.append({
                "priority": "Moyenne",
                "category": "Débit",
                "title": "Optimisation de la charge réseau",
                "detail": "Vérifier la charge des eNBs dans les zones de faible débit. Activer le CA (Carrier Aggregation) si disponible. Optimiser les paramètres de scheduling."
            })

        if "rscp" in issue_text or "umts" in issue_text:
            recs.append({
                "priority": "Moyenne",
                "category": "UMTS 3G",
                "title": "Migration 3G vers 4G recommandée",
                "detail": "Zones avec mauvaise couverture UMTS : accélérer le déploiement LTE et activer le redirection automatique 3G→4G (CSFB/SRVCC)."
            })

        if not recs:
            recs.append({
                "priority": "Basse",
                "category": "Maintenance",
                "title": "Surveillance continue recommandée",
                "detail": "Les KPIs analysés sont globalement satisfaisants. Maintenir une surveillance périodique et des campagnes drive test régulières."
            })

        return recs

    def get_context_for_ai(self, dataset_names: List[str]) -> str:
        """Build a text context string for the AI agent."""
        if not dataset_names:
            dataset_names = list(self.datasets.keys())

        lines = ["=== DONNÉES DRIVE TEST CHARGÉES ===\n"]
        for name in dataset_names:
            if name not in self.datasets:
                continue
            stats = self.get_detailed_stats(name)
            dist = self.get_kpi_distribution(name)
            ds = self.datasets[name]
            tech = ds["tech"]

            lines.append(f"📡 Dataset: {name} | Technologie: {tech} | Échantillons: {stats['total_samples']}")

            if tech == "LTE":
                for kpi in ["RSRP", "RSRQ", "Throughput_Mbps"]:
                    if kpi in stats:
                        s = stats[kpi]
                        lines.append(f"  {kpi}: moy={s['mean']}, min={s['min']}, max={s['max']}, n={s['count']}")

                for kpi_name, items in dist.get("distributions", {}).items():
                    dist_str = ", ".join([f"{d['level']}={d['percent']}%" for d in items])
                    lines.append(f"  Distribution {kpi_name}: {dist_str}")

            elif tech == "UMTS":
                for kpi in ["RSCP", "EcN0"]:
                    if kpi in stats:
                        s = stats[kpi]
                        lines.append(f"  {kpi}: moy={s['mean']}, min={s['min']}, max={s['max']}, n={s['count']}")

                for kpi_name, items in dist.get("distributions", {}).items():
                    dist_str = ", ".join([f"{d['level']}={d['percent']}%" for d in items])
                    lines.append(f"  Distribution {kpi_name}: {dist_str}")

            lines.append("")

        lines.append("=== SEUILS KPI (Référence) ===")
        lines.append("RSRP (LTE): >=−80 Très bonne | −90 à −80 Bonne | −100 à −90 Moyenne | −100 à −130 Mauvaise")
        lines.append("RSRQ (LTE): >=−5 Très bonne | −10 à −5 Acceptable | −14 à −10 Assez bien | <−14 Mauvaise")
        lines.append("Throughput DL: >=30Mbps Très bonne | 25-30 Acceptable | 20-25 Assez bien | 10-20 Mauvaise | <10 Inexistant")
        lines.append("RSCP (UMTS): >=-75 Très bonne | -85 à -75 Bonne | -95 à -85 Moyenne | <-95 Mauvaise")
        lines.append("Ec/N0 (UMTS): >=-6 Très bonne | -10 à -6 Bonne | -15 à -10 Moyenne | <-15 Mauvaise")

        return "\n".join(lines)
