document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO INICIAL ---
    const canvasContainer = document.getElementById('canvas-container');
    const canvas = document.createElement('canvas');
    canvas.width = canvasContainer.offsetWidth;
    canvas.height = canvasContainer.offsetHeight;
    canvasContainer.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const infoContent = document.getElementById('info-content');
    const clearButton = document.getElementById('clearButton');
    const toolButtons = document.querySelectorAll('.tool-button');
    const toolDescription = document.getElementById('tool-description').querySelector('p');
    const forceSlider = document.getElementById('forceSlider');
    const forceValueDisplay = document.getElementById('forceValue');

    let ferramentaAtual = 'martelo';
    let forceLevel = 2;
    let manchas = [];
    const origem = { x: canvas.width / 2, y: canvas.height * 0.4, z: 120 };

    // --- FUNÇÕES DE SIMULAÇÃO ---

    function simularImpacto(clickX, clickY) {
        let numeroDeManchas = 5 + Math.floor(Math.random() * 5) * forceLevel;
        let primeiraManchaDados = null;
        for (let i = 0; i < numeroDeManchas; i++) {
            const dispersao = 25 * forceLevel;
            const clusterX = clickX + (Math.random() - 0.5) * dispersao;
            const clusterY = clickY + (Math.random() - 0.5) * dispersao;
            const { mancha, ...dados } = calcularPropriedadesImpacto(clusterX, clusterY);
            manchas.push(mancha);
            if (i === 0) primeiraManchaDados = dados;
        }
        atualizarPainel(primeiraManchaDados, numeroDeManchas);
    }

    function simularGotejamento(clickX, clickY) {
        let numeroDeGotas = 1 + Math.floor(Math.random() * 2) * forceLevel;
        const { ...dados } = calcularPropriedadesImpacto(clickX, clickY);
        for (let i = 0; i < numeroDeGotas; i++) {
            manchas.push({
                x: clickX + (Math.random() - 0.5) * (15 * forceLevel),
                y: clickY + (Math.random() - 0.5) * (15 * forceLevel),
                comprimento: 20 + Math.random() * 10,
                largura: 18 + Math.random() * 8,
                corBase: [110 + Math.random() * 20, 0, 0],
                tipo: 'gota',
                highlight: 1.0,
                opacity: 1.0 // Opacidade total e permanente
            });
        }
        atualizarPainel(dados, numeroDeGotas);
    }

    // ATUALIZADO: Remove a lógica de tempo de vida.
    function simularAltaVelocidade(clickX, clickY) {
        let numeroDeGotas = 150 + Math.floor(Math.random() * 100);
        const { ...dados } = calcularPropriedadesImpacto(clickX, clickY);
        for (let i = 0; i < numeroDeGotas; i++) {
            const anguloDispersao = Math.random() * 2 * Math.PI;
            const raioDispersao = Math.random() * 200;
            manchas.push({
                x: clickX + Math.cos(anguloDispersao) * raioDispersao,
                y: clickY + Math.sin(anguloDispersao) * raioDispersao,
                comprimento: 1 + Math.random() * 2,
                largura: 1 + Math.random() * 2,
                corBase: [130 + Math.random() * 30, 0, 0],
                tipo: 'nevoa',
                highlight: 0,
                opacity: 0.7 // Opacidade fixa para parecer névoa, mas sem desaparecer
            });
        }
        atualizarPainel(dados, numeroDeGotas);
    }

    // --- FUNÇÕES DE CÁLCULO E DESENHO ---
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
        const mancha = { x, y, comprimento, largura, offsets, espiculas, corBase: [130 + Math.random() * 30, 0, 0], tipo: 'impacto', highlight: 1.0, opacity: 1.0 };
        return { mancha, distancia: distanciaNoPlano, alfa, comprimento, largura };
    }

    // ATUALIZADO: Lógica de desenho simplificada
    function desenharMancha(mancha) {
        if (mancha.highlight > 0) {
            ctx.shadowColor = `rgba(255, 80, 80, ${mancha.highlight})`;
            ctx.shadowBlur = 25;
        }
        
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
        } else { // 'gota' ou 'nevoa'
            ctx.beginPath();
            ctx.ellipse(mancha.x, mancha.y, mancha.comprimento / 2, mancha.largura / 2, 0, 0, 2 * Math.PI);
            ctx.fill();
        }
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    // --- MOTOR DE ANIMAÇÃO (ATUALIZADO) ---
    function loopDeAnimacao() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = manchas.length - 1; i >= 0; i--) {
            const mancha = manchas[i];
            
            // ATUALIZA ESTADO: Apenas o brilho agora
            if (mancha.highlight > 0) {
                mancha.highlight -= 0.016; // Fade out do brilho em ~1s
            }
            
            // DESENHA
            desenharMancha(mancha);
        }
        requestAnimationFrame(loopDeAnimacao);
    }

    // --- FUNÇÕES DE INTERFACE ---
    function atualizarPainel(dados, quantidade) {
        const { distancia, alfa, comprimento, largura } = dados;
        const anguloGraus = alfa * (180 / Math.PI);
        const tipoPadrao = {
            soco: 'Impacto de Média Velocidade', martelo: 'Impacto de Média Velocidade',
            faca: 'Gotejamento Passivo (Baixa Velocidade)', pistola: 'Névoa de Impacto (Alta Velocidade)'
        };
        const nomeDaContagem = (ferramentaAtual === 'pistola') ? 'Gotículas' : 'Gotas/Manchas';
        
        infoContent.innerHTML = `
            <div class="info-group">
                <p>Padrão Simulado</p>
                <code class="formula">${tipoPadrao[ferramentaAtual]}</code>
                <code class="calculation">↳ Quantidade de ${nomeDaContagem}: <span class="result">${quantidade}</span></code>
            </div>
            <div class="info-group">
                <p>Cálculo de Referência do Impacto (α)</p>
                <code class="formula">α = arctan(Profundidade / Distância)</code>
                <code class="calculation">↳ α = arctan(${origem.z.toFixed(0)} / ${distancia.toFixed(0)}) = <span class="result">${anguloGraus.toFixed(2)}°</span></code>
            </div>
            <div class="info-group">
                <p>Cálculo de Referência da Largura</p>
                <code class="formula">Largura = Comprimento * sen(α)</code>
                <code class="calculation">↳ Largura = ${comprimento.toFixed(2)} * sen(${anguloGraus.toFixed(2)}°) = <span class="result">${largura.toFixed(2)} px</span></code>
            </div>`;
    }

    function atualizarDescricaoFerramenta() {
        const descricoes = {
            soco: '<strong>Soco:</strong> Impacto de média velocidade que pode gerar respingos irregulares.',
            martelo: '<strong>Martelo:</strong> Impacto de média velocidade que gera respingos radiais distintos.',
            faca: '<strong>Faca:</strong> Arma cortante. Simula o gotejamento passivo do ferimento.',
            pistola: '<strong>Pistola:</strong> Impacto de alta velocidade que produz uma fina névoa de sangue.'
        };
        toolDescription.innerHTML = descricoes[ferramentaAtual];
    }
    
    // --- EVENTOS ---
    clearButton.addEventListener('click', () => { manchas = []; infoContent.innerHTML = '<p class="placeholder">Selecione uma ferramenta e clique na parede para simular um impacto.</p>'; });
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        switch (ferramentaAtual) {
            case 'soco': case 'martelo': simularImpacto(x, y); break;
            case 'faca': simularGotejamento(x, y); break;
            case 'pistola': simularAltaVelocidade(x, y); break;
        }
    });
    toolButtons.forEach(button => button.addEventListener('click', () => {
        toolButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        ferramentaAtual = button.dataset.tool;
        atualizarDescricaoFerramenta();
        document.querySelector('.force-controls').style.visibility = (ferramentaAtual === 'pistola') ? 'hidden' : 'visible';
    }));
    forceSlider.addEventListener('input', () => {
        forceLevel = parseInt(forceSlider.value);
        const levels = { 1: 'Baixa', 2: 'Média', 3: 'Alta' };
        forceValueDisplay.textContent = levels[forceLevel];
    });

    // --- INICIALIZAÇÃO ---
    atualizarDescricaoFerramenta();
    document.querySelector('.force-controls').style.visibility = (ferramentaAtual === 'pistola') ? 'hidden' : 'visible';
    loopDeAnimacao();
});