document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO INICIAL E ELEMENTOS DA UI ---
    const canvasContainer = document.getElementById('canvas-container');
    const canvas = document.createElement('canvas');
    canvas.width = canvasContainer.offsetWidth;
    canvas.height = canvasContainer.offsetHeight;
    canvasContainer.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const infoContent = document.getElementById('info-content');
    const clearButton = document.getElementById('clearButton');
    const toolButtons = document.querySelectorAll('.tool-button');
    const eventDescription = document.getElementById('event-description');
    const forceSlider = document.getElementById('forceSlider');
    const forceValueDisplay = document.getElementById('forceValue');
    const bodyPartSelect = document.getElementById('bodyPartSelect');
    const forceControlGroup = document.getElementById('force-control-group');

    // --- ESTADO DA APLICAÇÃO ---
    let ferramentaAtual = 'martelo';
    let regiaoAtual = 'TORAX';
    let forceLevel = 2;
    let manchas = [];
    const origem = { x: canvas.width / 2, y: canvas.height * 0.4, z: 120 };

    // --- MATRIZ DE SANGRAMENTO (BASEADA NA SUA TABELA) ---
    const perfisDeSangramento = {
        SOCO:    { CABECA: [1, 2, 3], ROSTO: [2, 2, 3], PESCOCO: [1, 2, 2], TORAX: [0, 1, 1], ABDOMEN: [0, 0, 0], COSTAS: [0, 0, 0], BRACOS: [0, 1, 1], PERNAS: [0, 1, 1], MAOS: [0, 1, 1], PES: [0, 1, 1] },
        MARTELO: { CABECA: [2, 3, 4], ROSTO: [2, 3, 3], PESCOCO: [2, 3, 3], TORAX: [1, 2, 3], ABDOMEN: [1, 1, 2], COSTAS: [1, 1, 2], BRACOS: [1, 2, 2], PERNAS: [1, 2, 2], MAOS: [1, 1, 2], PES: [1, 1, 2] },
        FACA:    { CABECA: [2, 2, 3], ROSTO: [2, 2, 2], PESCOCO: [2, 3, 5], TORAX: [3, 3, 4], ABDOMEN: [2, 2, 2], COSTAS: [2, 2, 2], BRACOS: [2, 3, 4], PERNAS: [2, 3, 4], MAOS: [2, 2, 2], PES: [2, 2, 2] },
        PISTOLA: { CABECA: [7], ROSTO: [6], PESCOCO: [7], TORAX: [7], ABDOMEN: [3, 4], COSTAS: [3, 4], BRACOS: [2, 5], PERNAS: [2, 5], MAOS: [1, 2], PES: [1, 2] }
    };
    const tiposDePadrao = {
        0: { tipo: 'nenhum', nome: 'Sem Sangramento Visível' },
        1: { tipo: 'gotejamento', volume: 5, dispersao: 10, nome: 'Gotejamento Leve (Localizado)' },
        2: { tipo: 'gotejamento_medio', volume: 15, dispersao: 30, nome: 'Gotejamento Moderado (Localizado)' },
        3: { tipo: 'impacto', volume: 25, dispersao: 60, nome: 'Impacto de Média Velocidade' },
        4: { tipo: 'impacto_forte', volume: 40, dispersao: 120, nome: 'Impacto Forte' },
        5: { tipo: 'jato_arterial', volume: 40, dispersao: 150, nome: 'Jato Arterial (Spurting)' },
        6: { tipo: 'nevoa_media', volume: 150, dispersao: 200, nome: 'Névoa de Alta Velocidade' },
        7: { tipo: 'nevoa_densa', volume: 250, dispersao: 250, nome: 'Névoa Densa de Alta Velocidade' }
    };
    const classMap = { 0: 'level-0', 1: 'level-1', 2: 'level-1', 3: 'level-2', 4: 'level-2', 5: 'level-3', 6: 'level-3', 7: 'level-3' };

    // --- FUNÇÕES DE LÓGICA E SIMULAÇÃO ---
    function obterParametros() {
        const perfilArma = perfisDeSangramento[ferramentaAtual.toUpperCase()];
        if (!perfilArma) return tiposDePadrao[0];
        
        const niveis = perfilArma[regiaoAtual];
        if (!niveis) return tiposDePadrao[0];

        let nivelDeSangramento;
        if (ferramentaAtual === 'pistola' || (ferramentaAtual === 'faca' && ['BRACOS', 'PERNAS', 'PESCOCO'].includes(regiaoAtual))) {
            nivelDeSangramento = niveis[Math.floor(Math.random() * niveis.length)];
        } else {
            nivelDeSangramento = niveis[forceLevel - 1];
        }
        return tiposDePadrao[nivelDeSangramento] || tiposDePadrao[0];
    }
    
    function simularPadrao(clickX, clickY, parametros) {
        if (parametros.tipo === 'nenhum') {
            return;
        }

        let numeroDeGotas = Math.floor(parametros.volume * (0.8 + Math.random() * 0.4));
        
        for (let i = 0; i < numeroDeGotas; i++) {
            let mancha;
            const { mancha: manchaBase } = calcularPropriedadesImpacto(clickX, clickY);

            if (parametros.tipo === 'jato_arterial') {
                const progress = i / numeroDeGotas;
                const arcX = clickX + progress * parametros.dispersao - (parametros.dispersao / 2);
                const arcY = clickY - Math.sin(progress * Math.PI) * (parametros.dispersao * 0.4);
                mancha = { ...manchaBase, x: arcX, y: arcY, comprimento: 15 + Math.random() * 5, largura: 10 + Math.random() * 5, tipo: 'gota' };
            } else if (parametros.tipo.includes('nevoa')) {
                const anguloDispersao = Math.random() * 2 * Math.PI;
                const raioDispersao = Math.random() * parametros.dispersao;
                mancha = { ...manchaBase, x: clickX + Math.cos(anguloDispersao) * raioDispersao, y: clickY + Math.sin(anguloDispersao) * raioDispersao, comprimento: 1 + Math.random() * 2, largura: 1 + Math.random() * 2, tipo: 'nevoa', highlight: 0, opacity: 0.7 };
            } else if (parametros.tipo.includes('gotejamento')) {
                mancha = { ...manchaBase, x: clickX + (Math.random() - 0.5) * parametros.dispersao, y: clickY + (Math.random() - 0.5) * parametros.dispersao, comprimento: 20 + Math.random() * 10, largura: 18 + Math.random() * 8, tipo: 'gota' };
            } else { // Impacto
                const dispersao = parametros.dispersao || 60;
                const clusterX = clickX + (Math.random() - 0.5) * dispersao;
                const clusterY = clickY + (Math.random() - 0.5) * dispersao;
                const { mancha: manchaCalculada } = calcularPropriedadesImpacto(clusterX, clusterY);
                mancha = manchaCalculada;
            }
            if (!mancha.corBase) mancha.corBase = [130 + Math.random() * 30, 0, 0];
            manchas.push(mancha);
        }
    }
    
    function calcularPropriedadesImpacto(x, y) {
        const dx = x - origem.x;
        const dy = y - origem.y;
        const distanciaNoPlano = Math.sqrt(dx * dx + dy * dy) || 1;
        const alfa = Math.atan(origem.z / distanciaNoPlano);
        
        const comprimentoBase = canvas.width * 0.035;
        const comprimento = comprimentoBase + Math.random() * (comprimentoBase * 0.4);
        const largura = Math.max(5, comprimento * Math.sin(alfa));

        const offsets = Array.from({length: 3}, () => ({ x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 }));
        const espiculas = [];
        const numeroDeEspiculas = 5 + Math.floor(Math.random() * 10);
        for (let i = 0; i < numeroDeEspiculas; i++) {
            const angulo = (Math.random() - 0.5) * Math.PI * 0.8;
            const startX = Math.cos(angulo) * (comprimento / 2);
            const startY = Math.sin(angulo) * (largura / 2);
            espiculas.push({ startX, startY, endX: startX * (1 + Math.random() * 0.3), endY: startY * (1 + Math.random() * 0.3), lineWidth: Math.random() * 1.5 + 0.5 });
        }
        const mancha = { x, y, comprimento, largura, offsets, espiculas, tipo: 'impacto', highlight: 1.0, opacity: 1.0 };
        return { mancha, distancia: distanciaNoPlano, alfa, comprimento, largura };
    }
    
    function calcularPropriedadesReferencia(x,y) {
        const dx = x - origem.x;
        const dy = y - origem.y;
        const distanciaNoPlano = Math.sqrt(dx * dx + dy * dy) || 1;
        const alfa = Math.atan(origem.z / distanciaNoPlano);
        return { distancia: distanciaNoPlano, alfa };
    }

    // --- MOTOR DE ANIMAÇÃO E DESENHO ---
    function loopDeAnimacao() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = manchas.length - 1; i >= 0; i--) {
            const mancha = manchas[i];
            if (mancha.highlight > 0) mancha.highlight -= 0.016;
            desenharMancha(mancha);
        }
        requestAnimationFrame(loopDeAnimacao);
    }

    function desenharMancha(mancha) {
        if (mancha.highlight > 0) { ctx.shadowColor = `rgba(255, 80, 80, ${mancha.highlight})`; ctx.shadowBlur = 25; }
        ctx.fillStyle = `rgba(${mancha.corBase[0]}, ${mancha.corBase[1]}, ${mancha.corBase[2]}, ${mancha.opacity})`;
        
        if (mancha.tipo === 'impacto') {
            const anguloRotacao = Math.atan2(mancha.y - origem.y, mancha.x - origem.x);
            ctx.save();
            ctx.translate(mancha.x, mancha.y);
            ctx.rotate(anguloRotacao);
            mancha.offsets.forEach(offset => {
                ctx.beginPath();
                ctx.ellipse(offset.x, offset.y, mancha.comprimento / 2, mancha.largura / 2, 0, 0, 2 * Math.PI);
                ctx.fill();
            });
            ctx.strokeStyle = ctx.fillStyle;
            mancha.espiculas.forEach(espicula => {
                ctx.beginPath();
                ctx.moveTo(espicula.startX, espicula.startY);
                ctx.lineTo(espicula.endX, espicula.endY);
                ctx.lineWidth = espicula.lineWidth;
                ctx.stroke();
            });
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.ellipse(mancha.x, mancha.y, mancha.comprimento / 2, mancha.largura / 2, 0, 0, 2 * Math.PI);
            ctx.fill();
        }
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
    
    // --- FUNÇÕES DE INTERFACE (UI) ---
    function atualizarPaineis(parametros, clickX, clickY) {
        const arma = ferramentaAtual.charAt(0).toUpperCase() + ferramentaAtual.slice(1);
        const regiao = bodyPartSelect.options[bodyPartSelect.selectedIndex].text;
        const forca = forceValueDisplay.textContent;
        const textoForca = ferramentaAtual !== 'pistola' ? ` com força ${forca.toLowerCase()}` : '';

        eventDescription.innerHTML = `
            <p><strong>Cenário Simulado:</strong> ${arma} na região da(o) ${regiao.toLowerCase()}${textoForca}.</p>
            <p><strong>Resultado Esperado:</strong> ${parametros.nome}</p>
        `;

        if (parametros.tipo === 'nenhum') {
            infoContent.innerHTML = `<p class="placeholder">Combinação improvável de resultar em sangramento visível.</p>`;
            return;
        }

        const { distancia, alfa } = calcularPropriedadesReferencia(clickX, clickY);
        const anguloGraus = alfa * (180 / Math.PI);
        const nomeDaContagem = parametros.tipo.includes('nevoa') ? 'Gotículas' : 'Gotas/Manchas';
        const { mancha: manchaRef } = calcularPropriedadesImpacto(clickX, clickY);
        
        infoContent.innerHTML = `
            <div class="info-group">
                <p>Análise do Padrão</p>
                <code class="calculation">↳ Quantidade Aprox.: <span class="result">${parametros.volume}</span></code>
            </div>
            <div class="info-group">
                <p>Cálculo de Referência do Impacto (α)</p>
                <code class="formula">α = arctan(Profundidade / Distância)</code>
                <code class="calculation">↳ α = arctan(${origem.z.toFixed(0)} / ${distancia.toFixed(0)}) = <span class="result">${anguloGraus.toFixed(2)}°</span></code>
            </div>`;
    }

    function atualizarIndicadoresDeSangramento() {
        const perfilArma = perfisDeSangramento[ferramentaAtual.toUpperCase()];
        if (!perfilArma) return;

        Array.from(bodyPartSelect.options).forEach(option => {
            const regiao = option.value.toUpperCase();
            const niveis = perfilArma[regiao] || [0];
            const maxNivel = Math.max(...niveis);
            const classeNivel = classMap[maxNivel] || 'level-0';
            
            const indicatorSpan = option.querySelector('.bleed-indicator');
            if (indicatorSpan) {
                indicatorSpan.className = 'bleed-indicator';
                indicatorSpan.classList.add(classeNivel);
                
                let dots = 0;
                if(classeNivel === 'level-1') dots = 1;
                if(classeNivel === 'level-2') dots = 2;
                if(classeNivel === 'level-3') dots = 3;
                indicatorSpan.textContent = '●'.repeat(dots);
            }
        });
    }
    
    // --- EVENTOS ---
    function handleUserInteraction() {
        const parametros = obterParametros();
        atualizarPaineis(parametros, 0, 0);
        infoContent.innerHTML = '<p class="placeholder">Clique na parede para simular o impacto.</p>';
    }
    
    toolButtons.forEach(button => button.addEventListener('click', () => {
        toolButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        ferramentaAtual = button.dataset.tool;
        forceControlGroup.style.visibility = (ferramentaAtual === 'pistola') ? 'hidden' : 'visible';
        atualizarIndicadoresDeSangramento();
        handleUserInteraction();
    }));

    forceSlider.addEventListener('input', (e) => {
        forceLevel = parseInt(e.target.value);
        const levels = { 1: 'Baixa', 2: 'Média', 3: 'Alta' };
        forceValueDisplay.textContent = levels[forceLevel];
        const min = e.target.min, max = e.target.max, val = e.target.value;
        e.target.style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%';
        handleUserInteraction();
    });

    bodyPartSelect.addEventListener('input', (e) => {
        regiaoAtual = e.target.value.toUpperCase();
        handleUserInteraction();
    });

    clearButton.addEventListener('click', () => {
        manchas = [];
        infoContent.innerHTML = '';
        eventDescription.innerHTML = '<p class="placeholder">Aguardando simulação...</p>';
    });
    
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const parametros = obterParametros();
        atualizarPaineis(parametros, x, y);
        simularPadrao(x, y, parametros);
    });

    // --- INICIALIZAÇÃO ---
    function inicializar() {
        forceSlider.dispatchEvent(new Event('input'));
        handleUserInteraction();
        atualizarIndicadoresDeSangramento();
        loopDeAnimacao();
    }
    
    inicializar();
});
