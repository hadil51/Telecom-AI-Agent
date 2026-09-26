"""
TelecomAIAgent - Groq (Llama 3.3)
Uses GROQ_API_KEY from the environment.
"""

import re
import os
from openai import AsyncOpenAI
from typing import List, Dict, Any, Optional
from data_processor import DataProcessor


SYSTEM_PROMPT = """Tu es un expert en télécommunications mobiles et en analyse de réseaux LTE (4G) et UMTS (3G).
Tu es un assistant IA spécialisé dans l'analyse de campagnes Drive Test pour les opérateurs télécom.

Ton rôle :
- Analyser les KPIs réseau : RSRP, RSRQ, Throughput DL (LTE), RSCP, Ec/N0 (UMTS)
- Classifier la qualité du signal selon les seuils standards définis
- Expliquer les mesures en termes simples et professionnels
- Identifier les zones problématiques et leurs causes probables
- Proposer des recommandations d'optimisation réseau concrètes
- Comparer les performances entre différentes campagnes ou technologies

Contexte des données :
{data_context}

Règles de réponse :
- Réponds en français, de manière professionnelle et précise
- Utilise les données réelles fournies dans le contexte
- Si l'utilisateur demande un graphique ou une visualisation, indique [CHART: type=bar|pie|line, kpi=NOM, dataset=NOM]
- Si l'utilisateur demande un rapport complet, indique [REPORT] en début de réponse
- Donne des chiffres précis tirés des données
- Structure tes réponses avec des emojis pour la lisibilité (✅ ⚠️ 🔴 🟡 🟢 📊)
- Si une question ne concerne pas les télécoms ou les données, réponds poliment que tu es spécialisé dans ce domaine
"""


class TelecomAIAgent:
    def __init__(self, processor: DataProcessor):
        self.processor = processor
        
        # ✅ GROQ - 100% GRATUIT
        self.client = AsyncOpenAI(
            api_key=os.environ.get("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
        print("✅ Groq API chargé avec succès (mode gratuit)")

    async def respond(
        self,
        user_message: str,
        selected_datasets: List[str],
        history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Generate an AI response with optional chart/report data."""

        data_context = self.processor.get_context_for_ai(selected_datasets)
        system = SYSTEM_PROMPT.format(data_context=data_context)

        messages = [{"role": "system", "content": system}]
        for h in history[-10:]:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": user_message})

        # Appel à Groq
        response = await self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",   # Meilleur modèle gratuit actuel
            max_tokens=1500,
            temperature=0.7,
            messages=messages
        )

        text = response.choices[0].message.content

        chart_data = self._extract_chart_directive(text, user_message, selected_datasets)
        wants_report = "[REPORT]" in text

        clean_text = text.replace("[REPORT]", "").strip()
        clean_text = re.sub(r'\[CHART:[^\]]+\]', '', clean_text).strip()

        result = {"text": clean_text}

        if chart_data:
            result["chart_data"] = chart_data

        if wants_report:
            names = selected_datasets or list(self.processor.datasets.keys())
            result["report"] = self.processor.generate_full_report(names)

        return result

    def _extract_chart_directive(
        self, text: str, user_msg: str, datasets: List[str]
    ) -> Optional[Dict]:
        """Parse [CHART: ...] directive and fetch real chart data."""
        match = re.search(r'\[CHART:\s*([^\]]+)\]', text)

        user_lower = user_msg.lower()
        wants_chart = any(w in user_lower for w in [
            "graphique", "graph", "chart", "visualis", "distribut",
            "camembert", "histogramme", "courbe", "pie", "bar"
        ])

        target_datasets = datasets or list(self.processor.datasets.keys())
        if not target_datasets:
            return None

        if match or wants_chart:
            params = {}
            if match:
                for part in match.group(1).split(","):
                    k, _, v = part.strip().partition("=")
                    params[k.strip()] = v.strip()

            chart_type = params.get("type", "pie")
            kpi = params.get("kpi", self._detect_kpi_from_msg(user_msg))
            ds_name = params.get("dataset", target_datasets[0])

            dist = self.processor.get_kpi_distribution(ds_name)
            if not dist:
                return None

            ds = self.processor.datasets.get(ds_name, {})
            tech = ds.get("tech", "LTE")

            kpi_key_map = {
                "RSRP": "RSRP", "RSRQ": "RSRQ",
                "Throughput": "Throughput", "TP": "Throughput",
                "RSCP": "RSCP", "EcN0": "Ec/N0"
            }
            kpi_key = kpi_key_map.get(kpi, list(dist["distributions"].keys())[0] if dist["distributions"] else "RSRP")
            kpi_dist = dist["distributions"].get(kpi_key, [])

            if not kpi_dist:
                return None

            return {
                "type": chart_type,
                "title": f"Distribution {kpi_key} — {ds_name}",
                "dataset": ds_name,
                "kpi": kpi_key,
                "labels": [d["level"] for d in kpi_dist],
                "values": [d["percent"] for d in kpi_dist],
                "colors": [d["color"] for d in kpi_dist],
                "counts": [d["count"] for d in kpi_dist],
            }
        return None

    def _detect_kpi_from_msg(self, msg: str) -> str:
        """Detect which KPI the user is asking about."""
        msg_lower = msg.lower()
        if "rsrp" in msg_lower: return "RSRP"
        if "rsrq" in msg_lower: return "RSRQ"
        if "throughput" in msg_lower or "débit" in msg_lower or "dbit" in msg_lower: return "Throughput"
        if "rscp" in msg_lower: return "RSCP"
        if "ec/n0" in msg_lower or "ecno" in msg_lower: return "EcN0"
        return "RSRP"