### Open-source models under Claude Code — comparisons

Stage-wise performance (%) across difficulty tiers, mean ± std over three runs. Average = overall score across all tiers (mean %, ± std as a fraction).

#### Table 1 — Open-source models vs. Opus 4.8 (Claude Code harness)

Best value per column in **bold**. Δ = Average minus Opus 4.8 (percentage points).

| Model | Easy Exp. | Easy Recon | Easy VD | Easy Exploit. | Med. Exp. | Med. Recon | Med. VD | Med. Exploit. | Hard Exp. | Hard Recon | Hard VD | Hard Exploit. | Average | Δ vs. Opus |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Opus 4.8 (proprietary) | 79.4 ± 6.3 | 72.1 ± 8.7 | 77.4 ± 4.1 | 54.6 ± 13.7 | 91.0 ± 1.7 | **82.3 ± 8.9** | 56.2 ± 9.1 | 39.7 ± 12.3 | 83.5 ± 1.6 | 47.1 ± 3.3 | 39.4 ± 2.0 | 4.8 ± 1.7 | 59.5 ± 0.03 | — |
| GLM 5.3 | **94.3 ± 2.9** | 83.8 ± 5.4 | **88.1 ± 4.1** | **72.1 ± 13.1** | 90.6 ± 2.9 | 75.2 ± 7.5 | 51.4 ± 14.2 | 37.7 ± 13.5 | **91.4 ± 0.0** | **65.1 ± 4.8** | **52.7 ± 3.1** | **28.8 ± 4.5** | **67.8 ± 0.04** | +8.3 |
| Mistral Large 4† | 92.9 ± 6.1 | 67.6 ± 22.9 | 73.2 ± 27.8 | 55.7 ± 32.5 | 82.3 ± 14.8 | 61.7 ± 15.0 | 49.0 ± 4.4 | 43.0 ± 9.2 | 81.7 ± 0.0 | 36.5 ± 0.0 | 22.3 ± 0.0 | 3.0 ± 0.0 | 54.3 ± 0.00 | −5.2 |
| Qwen 3.8 Flash | 91.7 ± 2.0 | **85.6 ± 8.3** | **88.1 ± 4.1** | **72.1 ± 6.6** | **94.5 ± 1.9** | 78.7 ± 3.7 | **59.0 ± 6.4** | **47.0 ± 5.3** | 88.9 ± 2.5 | 47.6 ± 6.9 | 44.8 ± 2.1 | 13.4 ± 2.4 | 66.4 ± 0.01 | +6.9 |
| Nemotron 3 Ultra | 79.4 ± 1.1 | 41.4 ± 9.5 | 39.3 ± 3.6 | 19.7 ± 6.6 | 73.1 ± 9.4 | 39.7 ± 8.6 | 3.5 ± 1.2 | 0.9 ± 0.0 | 67.0 ± 9.4 | 14.8 ± 2.4 | 2.3 ± 1.6 | 0.0 ± 0.0 | 34.1 ± 0.01 | −25.4 |

**Key observations (Table 1).**

- **Two open-source models outperform Opus 4.8 under the same harness.** With Claude Code as the harness, GLM 5.3 (67.8%) and Qwen 3.8 Flash (66.4%) exceed Opus 4.8 (59.5%) by +8.3 and +6.9 pp on the overall average. Mistral Large 4 trails slightly (−5.2 pp), and Nemotron 3 Ultra falls far behind (−25.4 pp).
- **The advantage comes mainly from the Easy tier and the later stages of Hard apps.** On Easy apps, GLM and Qwen lead Opus on every stage (e.g., Exploitation 72.1% vs. 54.6%). On Hard apps, GLM 5.3 reaches 28.8% Exploitation against 4.8% for Opus, and also leads on Recon (65.1% vs. 47.1%) and VD (52.7% vs. 39.4%).
- **Opus 4.8 stays competitive on Medium apps.** It has the best Medium Recon score (82.3%), and its Medium VD and Exploitation (56.2% / 39.7%) are on par with GLM 5.3's (51.4% / 37.7%). Only Qwen 3.8 Flash is clearly ahead there (59.0% / 47.0%).
- **Exploration is close to saturated; the differences appear deeper in the kill chain.** Most models reach roughly 80–95% Exploration on every tier, but scores fall steeply through Recon → VD → Exploitation, especially on Hard apps. Which model is better is therefore decided by whether it can turn findings into confirmed vulnerabilities and working exploits, not by how much of the app it maps.
- **Nemotron 3 Ultra rarely gets past exploration.** Its Medium and Hard VD and Exploitation scores are close to zero (≤ 3.5%). Its Claude Code runs are also much shorter than the others' (≈ 11 min on average vs. ≈ 56–60 min for GLM 5.3 and Qwen 3.8 Flash under a 2-hour budget). This suggests it ends sessions early instead of working persistently on the target.
- **Mistral Large 4 results are less reliable.** It has fewer runs (†), very high variance on Easy (SD up to 32.5), and 16 timed-out Medium runs.

#### Table 2 — OpenCode vs. Claude Code per open-source model

Δ = Claude Code − OpenCode (percentage points); positive favours Claude Code. Gain = change in Average from OpenCode to Claude Code (pp, with relative % in brackets). The better harness per cell is in **bold**.

| Model | Harness | Easy Exp. | Easy Recon | Easy VD | Easy Exploit. | Med. Exp. | Med. Recon | Med. VD | Med. Exploit. | Hard Exp. | Hard Recon | Hard VD | Hard Exploit. | Average | Gain |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GLM 5.3 | OpenCode | **95.2 ± 2.5** | **85.6 ± 3.1** | 84.5 ± 7.4 | 63.4 ± 13.7 | **91.3 ± 3.7** | **76.6 ± 4.3** | 49.3 ± 6.7 | 35.1 ± 12.0 | 88.2 ± 2.8 | 52.4 ± 8.8 | 44.6 ± 13.3 | 15.2 ± 1.5 | 63.7 ± 0.03 | |
| GLM 5.3 | Claude Code | 94.3 ± 2.9 | 83.8 ± 5.4 | **88.1 ± 4.1** | **72.1 ± 13.1** | 90.6 ± 2.9 | 75.2 ± 7.5 | **51.4 ± 14.2** | **37.7 ± 13.5** | **91.4 ± 0.0** | **65.1 ± 4.8** | **52.7 ± 3.1** | **28.8 ± 4.5** | **67.8 ± 0.04** | **+4.1** (+6.4%) |
| GLM 5.3 | *Δ* | *−0.9* | *−1.8* | *+3.6* | *+8.7* | *−0.7* | *−1.4* | *+2.1* | *+2.6* | *+3.2* | *+12.7* | *+8.1* | *+13.6* | *+4.1* | |
| Mistral Large 4† | OpenCode | **93.3 ± 1.6** | **74.8 ± 11.3** | **82.1 ± 6.2** | **67.8 ± 10.0** | **94.1 ± 0.8** | **77.3 ± 4.4** | 43.8 ± 4.2 | 27.0 ± 4.8 | **91.0 ± 0.6** | **54.5 ± 5.1** | **34.5 ± 7.2** | **10.6 ± 0.0** | **61.4 ± 0.02** | |
| Mistral Large 4† | Claude Code | 92.9 ± 6.1 | 67.6 ± 22.9 | 73.2 ± 27.8 | 55.7 ± 32.5 | 82.3 ± 14.8 | 61.7 ± 15.0 | **49.0 ± 4.4** | **43.0 ± 9.2** | 81.7 ± 0.0 | 36.5 ± 0.0 | 22.3 ± 0.0 | 3.0 ± 0.0 | 54.3 ± 0.00 | **−7.1** (−11.6%) |
| Mistral Large 4† | *Δ* | *−0.4* | *−7.2* | *−8.9* | *−12.1* | *−11.8* | *−15.6* | *+5.2* | *+16.0* | *−9.3* | *−18.0* | *−12.2* | *−7.6* | *−7.1* | |
| Qwen 3.8 Flash | OpenCode | **94.6 ± 1.1** | 83.8 ± 5.4 | 78.6 ± 7.1 | 61.2 ± 7.6 | 93.7 ± 1.3 | 76.6 ± 7.7 | 46.5 ± 7.3 | 36.8 ± 9.5 | **89.2 ± 1.9** | 46.0 ± 6.9 | 37.8 ± 3.6 | 13.1 ± 3.2 | 62.4 ± 0.04 | |
| Qwen 3.8 Flash | Claude Code | 91.7 ± 2.0 | **85.6 ± 8.3** | **88.1 ± 4.1** | **72.1 ± 6.6** | **94.5 ± 1.9** | **78.7 ± 3.7** | **59.0 ± 6.4** | **47.0 ± 5.3** | 88.9 ± 2.5 | **47.6 ± 6.9** | **44.8 ± 2.1** | **13.4 ± 2.4** | **66.4 ± 0.01** | **+4.0** (+6.4%) |
| Qwen 3.8 Flash | *Δ* | *−2.9* | *+1.8* | *+9.5* | *+10.9* | *+0.8* | *+2.1* | *+12.5* | *+10.2* | *−0.3* | *+1.6* | *+7.0* | *+0.3* | *+4.0* | |
| Nemotron 3 Ultra | OpenCode | **91.1 ± 2.2** | **67.6 ± 5.4** | **65.5 ± 5.5** | **48.1 ± 7.6** | **89.7 ± 0.8** | **64.5 ± 1.2** | **22.2 ± 4.8** | **8.4 ± 4.9** | **85.3 ± 2.2** | **36.0 ± 6.4** | **12.2 ± 2.7** | **2.8 ± 3.5** | **49.5 ± 0.02** | |
| Nemotron 3 Ultra | Claude Code | 79.4 ± 1.1 | 41.4 ± 9.5 | 39.3 ± 3.6 | 19.7 ± 6.6 | 73.1 ± 9.4 | 39.7 ± 8.6 | 3.5 ± 1.2 | 0.9 ± 0.0 | 67.0 ± 9.4 | 14.8 ± 2.4 | 2.3 ± 1.6 | 0.0 ± 0.0 | 34.1 ± 0.01 | **−15.4** (−31.1%) |
| Nemotron 3 Ultra | *Δ* | *−11.7* | *−26.2* | *−26.2* | *−28.4* | *−16.6* | *−24.8* | *−18.7* | *−7.5* | *−18.3* | *−21.2* | *−9.9* | *−2.8* | *−15.4* | |

† Under Claude Code, Mistral Large 4 has two runs for Easy and Medium and a single run for Hard; its Average is from the single run covering all tiers.

**Key observations (Table 2).**

- **The harness effect depends on the model.** Moving from OpenCode to Claude Code improves GLM 5.3 (+4.1 pp, +6.4%) and Qwen 3.8 Flash (+4.0 pp, +6.4%), but lowers Mistral Large 4 (−7.1 pp, −11.6%) and Nemotron 3 Ultra (−15.4 pp, −31.1%). A harness is not a neutral wrapper: the same model can gain or lose a lot depending on the agent scaffold it runs in.
- **Where Claude Code helps, it helps in exploitation, not exploration.** For GLM 5.3 and Qwen 3.8 Flash, Exploration barely changes or drops slightly (−0.3 to −2.9 pp). The gains are concentrated in VD and Exploitation: Qwen gains +9.5 / +10.9 pp on Easy and +12.5 / +10.2 pp on Medium. GLM's Hard Exploitation almost doubles (15.2% → 28.8%), with Hard Recon up +12.7 pp. This suggests Claude Code's agent loop helps capable models carry out longer multi-step attack chains. GLM 5.3 used its full 2-hour budget on 16 of 24 Hard runs.
- **Nemotron 3 Ultra gets worse on every metric.** The largest drops are on Easy Recon, VD and Exploitation (−26 to −28 pp). Together with its short sessions under Claude Code, this points to a poor fit between the model and Claude Code's tool-use and termination conventions rather than a lack of security knowledge, since the same model reaches 48.1% Easy Exploitation under OpenCode.
- **Mistral Large 4 shows mixed effects.** It improves on Medium VD and Exploitation (+5.2 / +16.0 pp) but drops on most other stages, especially on Hard (−18.0 pp Recon). Its Hard numbers come from a single run, so this comparison should be treated as preliminary.
- **Claude Code makes the gaps between models much larger.** Under OpenCode, the four open-source models span 14.2 pp (49.5–63.7%); under Claude Code, they span 33.7 pp (34.1–67.8%). Strong models benefit from the richer scaffold, while weaker or poorly matched models lose more.