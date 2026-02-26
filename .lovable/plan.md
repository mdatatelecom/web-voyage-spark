## Provisionamento CFTV - Implementado ✅

Todas as regras de provisionamento foram implementadas conforme a matriz de regras.

### Resumo das Alterações

1. **DVR**: Gera portas BNC para cada canal + 1 Uplink ✅
2. **NVR Padrão**: Gera 1 Uplink + 1 LAN/IPC, sem PoE ✅
3. **NVR PoE**: 1 Uplink + portas PoE dedicadas (já existia) ✅
4. **Câmera Analógica → apenas DVR** (filtro no wizard) ✅
5. **Câmera Analógica exige fonte DC** (step 6 com 3 opções) ✅
6. **Câmera IP + NVR PoE**: valida portas PoE disponíveis, pula power step ✅
7. **Câmera IP + NVR Padrão**: obriga power source (switch/injetor/fonte) ✅
8. **Câmera IP standalone**: marca como "not_recording" ✅
