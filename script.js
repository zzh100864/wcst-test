document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginContainer = document.getElementById('login-container');
    const practiceContainer = document.getElementById('practice-container');
    const testContainer = document.getElementById('test-container');
    const resultsContainer = document.getElementById('results-container');
    const nameInput = document.getElementById('name-input');
    const startButton = document.getElementById('start-button');
    const startRealTestButton = document.getElementById('start-real-test-button');
    const userNameDisplay = document.getElementById('user-name-display');
    const trialCounter = document.getElementById('trial-counter');
    const stimulusCard = document.getElementById('stimulus-card');
    const practiceStimulusCard = document.getElementById('practice-stimulus-card');
    const templateCardsArea = document.getElementById('template-cards-area');
    const feedbackText = document.getElementById('feedback-text');
    const practiceFeedbackText = document.getElementById('practice-feedback-text');
    const summaryResults = document.getElementById('summary-results');
    const detailedResultsTable = document.getElementById('detailed-results-table');
    const exportButton = document.getElementById('export-button');

    // Test state
    let userName = '';
    let currentTrial = 0;
    const totalTrials = 128;
    let stimulusCards = [];
    let templateCards = [];
    let results = [];
    let currentRule = 'C'; // C: Color, F: Form, N: Number
    let ruleSequence = ['C', 'F', 'N', 'C', 'F', 'N'];
    let ruleIndex = 0;
    let consecutiveCorrect = 0;
    let ptpDimension = null; // Perseverated-to-principle dimension
    let lastIncorrectDimension = null;
    let consecutiveIncorrectCount = 0; // Tracks consecutive errors for PTP
    let categoriesCompleted = 0;
    let startTime = 0; // 试次开始时间（用于计算反应时间）

    // --- Card Generation ---
    const shapes = {'T': '▲', 'S': '★', 'C': '+', 'O': '●'};
    const colors = {'R': 'red', 'G': 'green', 'B': 'blue', 'Y': 'yellow'};

    function createCardElement(shape, color, number) {
        const card = document.createElement('div');
        card.classList.add('card-content');
        let content = '';
        for (let i = 0; i < number; i++) {
            content += `<span class="card-symbol" style="color: ${colors[color]};">${shapes[shape]}</span>`;
        }
        card.innerHTML = content;
        return card;
    }

    function generateStimulusCards() {
        const localShapes = ['T', 'S', 'C', 'O'];
        const localColors = ['R', 'G', 'B', 'Y'];
        const numbers = [1, 2, 3, 4];
        let cards = [];
        for (const shape of localShapes) {
            for (const color of localColors) {
                for (const number of numbers) {
                    cards.push({ shape, color, number });
                }
            }
        }

        // Create a second set and shuffle
        let deck = [...cards, ...cards];

        // Fisher-Yates Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    function setupTemplateCards() {
        templateCards = [
            { id: 1, shape: 'T', color: 'R', number: 1 }, // One red triangle
            { id: 2, shape: 'S', color: 'G', number: 2 }, // Two green stars
            { id: 3, shape: 'C', color: 'Y', number: 3 }, // Three yellow crosses
            { id: 4, shape: 'O', color: 'B', number: 4 }  // Four blue circles
        ];

        templateCards.forEach(cardData => {
            const cardContainer = document.getElementById(`template-${cardData.id}`);
            const cardEl = cardContainer.querySelector('.card');
            cardEl.innerHTML = ''; // Clear previous content
            cardEl.appendChild(createCardElement(cardData.shape, cardData.color, cardData.number));
            cardEl.dataset.cardId = cardData.id;
            cardContainer.addEventListener('click', () => handleCardChoice(cardData));
        });
    }

    // --- Test Logic ---
    // 练习模式的全局变量
    let practiceStimulusCards = [];
    let practiceCurrentRule = 'C';
    let practiceConsecutiveCorrect = 0;
    let practiceCurrentTrial = 0;

    function startTest() {
        userName = nameInput.value.trim();
        if (!userName) {
            alert('请输入您的姓名。');
            return;
        }
        loginContainer.classList.add('hidden');
        
        // 初始化练习数据
        practiceStimulusCards = generateStimulusCards();
        setupPracticeTemplateCards();
        practiceCurrentRule = ruleSequence[0];
        practiceConsecutiveCorrect = 0;
        practiceCurrentTrial = 0;
        
        // 直接进入练习模式
        practiceContainer.classList.remove('hidden');
        userNameDisplay.textContent = `姓名: ${userName}`;
        nextPracticeTrial();
    }
    
    function setupPracticeTemplateCards() {
        templateCards = [
            { id: 1, shape: 'T', color: 'R', number: 1 }, // One red triangle
            { id: 2, shape: 'S', color: 'G', number: 2 }, // Two green stars
            { id: 3, shape: 'C', color: 'Y', number: 3 }, // Three yellow crosses
            { id: 4, shape: 'O', color: 'B', number: 4 }  // Four blue circles
        ];

        // 为练习模式的模板卡片添加事件监听器
        templateCards.forEach(cardData => {
            const cardContainer = document.getElementById(`practice-template-${cardData.id}`);
            const cardEl = cardContainer.querySelector('.card');
            cardEl.innerHTML = ''; // Clear previous content
            cardEl.appendChild(createCardElement(cardData.shape, cardData.color, cardData.number));
            cardEl.dataset.cardId = cardData.id;
            
            // 移除旧的事件监听器
            const newCardContainer = cardContainer.cloneNode(true);
            cardContainer.parentNode.replaceChild(newCardContainer, cardContainer);
            
            // 添加新的事件监听器
            newCardContainer.addEventListener('click', () => handlePracticeCardChoice(cardData));
        });
    }
    
    function nextPracticeTrial() {
        practiceCurrentTrial++;
        practiceFeedbackText.textContent = '';
        practiceFeedbackText.className = '';

        const cardData = practiceStimulusCards[practiceCurrentTrial % practiceStimulusCards.length];
        practiceStimulusCard.innerHTML = '';
        practiceStimulusCard.appendChild(createCardElement(cardData.shape, cardData.color, cardData.number));

        // Reset hover effects
        document.querySelectorAll('[id^="practice-template-"]').forEach(c => {
            if (c.classList.contains('card-container')) {
                c.style.backgroundColor = '';
            }
        });
    }
    
    function handlePracticeCardChoice(chosenTemplate) {
        const stimulus = practiceStimulusCards[practiceCurrentTrial % practiceStimulusCards.length];
        const isCorrect = checkCorrectness(stimulus, chosenTemplate);
        const responseDimension = getResponseDimension(stimulus, chosenTemplate);

        if (isCorrect) {
            practiceConsecutiveCorrect++;
            practiceFeedbackText.textContent = '正确';
            practiceFeedbackText.className = 'correct';
            if (practiceConsecutiveCorrect === 10) {
                // 练习模式也会切换规则，但不会计入正式测试的分类完成数
                const ruleIndex = ['C', 'F', 'N'].indexOf(practiceCurrentRule);
                practiceCurrentRule = ['C', 'F', 'N'][(ruleIndex + 1) % 3];
                practiceConsecutiveCorrect = 0;
                practiceFeedbackText.textContent = `规则已切换！现在请按照${practiceCurrentRule === 'C' ? '颜色' : practiceCurrentRule === 'F' ? '形状' : '数量'}匹配`;
            }
        } else {
            practiceConsecutiveCorrect = 0;
            practiceFeedbackText.textContent = '错误';
            practiceFeedbackText.className = 'incorrect';
        }

        // 调整反馈显示时间，符合文档中的时间要求
        setTimeout(nextPracticeTrial, isCorrect ? 200 : 400);
    }
    
    function startRealTest() {
        practiceContainer.classList.add('hidden');
        
        // 初始化正式测试数据
        stimulusCards = generateStimulusCards();
        setupTemplateCards();
        currentTrial = 0;
        results = [];
        currentRule = ruleSequence[0];
        ruleIndex = 0;
        consecutiveCorrect = 0;
        categoriesCompleted = 0;
        ptpDimension = null;
        lastIncorrectDimension = null;
        
        // 开始正式测试
        testContainer.classList.remove('hidden');
        nextTrial();
    }

    function nextTrial() {
        if (currentTrial >= totalTrials || categoriesCompleted >= 6) {
            endTest();
            return;
        }
        currentTrial++;
        updateTrialCounter();
        feedbackText.textContent = '';
        feedbackText.className = '';

        const cardData = stimulusCards[currentTrial - 1];
        stimulusCard.innerHTML = '';
        stimulusCard.appendChild(createCardElement(cardData.shape, cardData.color, cardData.number));

        // 记录试次开始时间（用于计算反应时间）
        startTime = Date.now();

        // Reset hover effects
        document.querySelectorAll('.card-container').forEach(c => c.style.backgroundColor = '');
    }

    function handleCardChoice(chosenTemplate) {
        // 计算反应时间（毫秒）
        const reactionTime = Date.now() - startTime;
        
        const stimulus = stimulusCards[currentTrial - 1];
        const isCorrect = checkCorrectness(stimulus, chosenTemplate);
        const responseDimension = getResponseDimension(stimulus, chosenTemplate);
        const isAmbiguous = checkAmbiguity(stimulus);

        let perseverative = '';

        if (isCorrect) {
            // Reset incorrect streak tracking
            consecutiveIncorrectCount = 0;
            lastIncorrectDimension = null;
        } else { // Incorrect response
            // 1. Check if this error matches an already established PTP
            if (ptpDimension && responseDimension === ptpDimension) {
                perseverative = 'P';
            }

            // 2. Update consecutive error tracking to establish PTP
            if (responseDimension === lastIncorrectDimension) {
                consecutiveIncorrectCount++;
            } else {
                // If the dimension of error changes, reset the counter
                consecutiveIncorrectCount = 1;
                lastIncorrectDimension = responseDimension;
            }

            // 3. Establish PTP if it's not set and we have 2 consecutive errors.
            // This happens *after* checking for 'P', so the establishing trial itself is not marked.
            if (!ptpDimension && consecutiveIncorrectCount === 2) {
                ptpDimension = lastIncorrectDimension;
            }
        }

        results.push({
            trial: currentTrial,
            stimulus: `${stimulus.number}${stimulus.color}${stimulus.shape}`,
            response: responseDimension,
            correct: isCorrect,
            perseverative: perseverative,
            ambiguous: isAmbiguous ? '*' : '',
            rule: currentRule,
            reactionTime: reactionTime // 添加反应时间（毫秒）
        });

        // "Sandwich" rule for perseveration (retroactive update)
        if (results.length >= 3) {
            const lastThree = results.slice(-3);
            const [first, middle, last] = lastThree;

            // Trigger: a correct response sandwiched between two perseverative ERRORS.
            if (
                (first.perseverative === 'P' && !first.correct) &&
                (last.perseverative === 'P' && !last.correct) &&
                middle.correct
            ) {
                // The middle one is also marked 'P' if it conforms to the PTP dimension.
                if (middle.response === ptpDimension) {
                    const middleIndex = results.length - 2;
                    if(results[middleIndex]) { // Ensure index exists
                       results[middleIndex].perseverative = 'P';
                    }
                }
            }
        }


        if (isCorrect) {
            consecutiveCorrect++;
            feedbackText.textContent = '正确';
            feedbackText.className = 'correct';
            if (consecutiveCorrect === 10) {
                changeRule();
            }
        } else {
            consecutiveCorrect = 0;
            feedbackText.textContent = '错误';
            feedbackText.className = 'incorrect';
        }

        // 调整反馈显示时间，符合文档中的时间要求
        setTimeout(nextTrial, isCorrect ? 200 : 400);
    }

    function checkCorrectness(stimulus, template) {
        // 根据当前显示的容器确定使用哪个规则
        const isPracticeMode = !practiceContainer.classList.contains('hidden');
        const ruleToUse = isPracticeMode ? practiceCurrentRule : currentRule;
        
        switch (ruleToUse) {
            case 'C': return stimulus.color === template.color;
            case 'F': return stimulus.shape === template.shape;
            case 'N': return stimulus.number === template.number;
        }
    }

    function getResponseDimension(stimulus, template) {
        if (stimulus.color === template.color) return 'C';
        if (stimulus.shape === template.shape) return 'F';
        if (stimulus.number === template.number) return 'N';
        return 'O'; // Other/None
    }

    function checkAmbiguity(stimulus) {
        let matches = 0;
        templateCards.forEach(template => {
            if (stimulus.color === template.color) matches++;
            if (stimulus.shape === template.shape) matches++;
            if (stimulus.number === template.number) matches++;
        });
        return matches > 1;
    }

    function changeRule() {
        consecutiveCorrect = 0;
        ruleIndex++;
        categoriesCompleted++;
        if (ruleIndex < ruleSequence.length) {
            currentRule = ruleSequence[ruleIndex];
            ptpDimension = null; // Reset PTP when rule changes
            lastIncorrectDimension = null;
            consecutiveIncorrectCount = 0;
            results.push({ trial: '---', stimulus: `完成 ${categoriesCompleted} 类`, response: '---', correct: '---', perseverative: '---', ambiguous: '---', rule: `新规则: ${currentRule}` });
        }
    }

    function updateTrialCounter() {
        // 保持功能但不在页面上显示试次计数
        // trialCounter.textContent = `试次: ${currentTrial}/${totalTrials}`;
        // 隐藏试次计数元素
        trialCounter.style.display = 'none';
    }

    // --- Results ---
    function endTest() {
        testContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        calculateAndDisplayResults();
    }

    function calculateAndDisplayResults() {
        const totalCompleted = currentTrial;
        const validTrials = results.filter(r => typeof r.trial === 'number');
        const correctResponses = validTrials.filter(r => r.correct === true).length;
        const accuracy = totalCompleted > 0 ? (correctResponses / validTrials.length * 100).toFixed(1) + '%' : 'N/A';
        const perseverativeErrors = validTrials.filter(r => r.perseverative === 'P' && !r.correct).length;
        const perseverativeResponses = validTrials.filter(r => r.perseverative === 'P').length;

        summaryResults.innerHTML = `
            <div>总实验数: <span>${totalCompleted}</span></div>
            <div>正确率: <span>${accuracy}</span></div>
            <div>持续性错误: <span>${perseverativeErrors}</span></div>
            <div>持续性应答数: <span>${perseverativeResponses}</span></div>
            <div>完成分类数: <span>${categoriesCompleted}</span></div>
        `;

        let tableHTML = '<table><thead><tr><th>试次</th><th>顺序正确数</th><th>回应</th><th>坚持性回应</th><th>星号(*)</th></tr></thead><tbody>';
        let correctInRow = 0;
        results.forEach(res => {
            if (typeof res.trial === 'number') {
                if(res.correct) correctInRow++; else correctInRow = 0;

                tableHTML += `
                    <tr>
                        <td>${res.trial}</td>
                        <td>${res.correct ? correctInRow : ''}</td>
                        <td>${res.response}${res.ambiguous}</td>
                        <td>${res.perseverative}</td>
                        <td>${res.ambiguous}</td>
                    </tr>
                `;
            } else {
                correctInRow = 0;
                tableHTML += `<tr class="rule-change"><td colspan="5">${res.stimulus}</td></tr>`;
            }
        });
        tableHTML += '</tbody></table>';
        detailedResultsTable.innerHTML = tableHTML;
    }

    function exportToExcel() {
        // 创建符合要求的数据结构
        const validTrials = results.filter(r => typeof r.trial === 'number');
        const correctResponses = validTrials.filter(r => r.correct === true).length;
        const accuracy = validTrials.length > 0 ? correctResponses / validTrials.length : 0;
        const perseverativeErrors = validTrials.filter(r => r.perseverative === 'P' && !r.correct).length;
        const perseverativeResponses = validTrials.filter(r => r.perseverative === 'P').length;
        
        // 获取当前时间
        const now = new Date();
        const dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 ' +
                       String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        
        // 统计信息区域
        const data = [
            ['姓名', userName],
            ['总实验数', currentTrial],
            ['正确率', accuracy.toFixed(6)],
            ['持续性错误', perseverativeErrors],
            ['持续性应答数', perseverativeResponses],
            ['完成分类数', categoriesCompleted],
            [],
            ['试次', '顺序正确数', '回应', '坚持性回应', '星号(*)']
        ];
        
        let correctInRow = 0;
        results.forEach(res => {
            if (typeof res.trial === 'number') {
                if(res.correct) correctInRow++; else correctInRow = 0;
                data.push([res.trial, res.correct ? correctInRow : '', res.response, res.perseverative, res.ambiguous]);
            } else {
                correctInRow = 0;
                data.push([res.stimulus, '', '', '', '']);
            }
        });

        // 创建一个新的工作表用于详细数据
        const detailData = [];
        let trialIndex = 1;
        
        // 详细数据标题行
        detailData.push(['序号', '刺激卡片属性', '选择的目标卡片', '当前规则', '是否正确', '反应时间']);
        
        // 添加详细试次数据
        validTrials.forEach(trial => {
            let stimulusAttr = trial.stimulus;
            let targetCard = '目标' + (trial.response === 'C' ? '颜色' : trial.response === 'F' ? '形状' : trial.response === 'N' ? '数量' : '未知');
            let currentRuleText = trial.rule === 'C' ? 'color' : trial.rule === 'F' ? 'shape' : 'number';
            let isCorrectText = trial.correct ? '正确' : '错误';
            
            // 反应时间保留一位小数（秒）
            const reactionTimeInSeconds = trial.reactionTime ? (trial.reactionTime / 1000).toFixed(1) : '';
            detailData.push([trialIndex++, stimulusAttr, targetCard, currentRuleText, isCorrectText, reactionTimeInSeconds]);
        });

        // 添加统计分析部分
        detailData.push(['']);
        detailData.push(['统计分析']);
        detailData.push(['指标', '数值', '说明']);
        detailData.push(['总试次数', currentTrial, '完成的试次总数']);
        detailData.push(['总正确率', (accuracy * 100).toFixed(1) + '%', '所有试次的正确率']);
        detailData.push(['持续性错误', perseverativeErrors, '在规则改变后仍按旧规则反应的错误次数']);
        detailData.push(['持续性应答', perseverativeResponses, '连续选择同一目标的次数']);
        detailData.push(['完成分类数', categoriesCompleted, '成功完成的分类规则数量']);
        
        // 添加测试名称和时间
        detailData.push(['']);
        detailData.push(['测试名称', '认知灵活性测试（威斯康星卡片分类任务）']);
        detailData.push(['测试时间', dateStr]);
        detailData.push(['主要指标']);
        detailData.push(['总实验数', currentTrial]);
        detailData.push(['正确率', (accuracy * 100).toFixed(1) + '%']);
        detailData.push(['持续性错误数', perseverativeErrors]);
        detailData.push(['持续性应答数', perseverativeResponses]);
        detailData.push(['完成分类数', categoriesCompleted]);

        // 创建工作簿和工作表
        const workbook = XLSX.utils.book_new();
        const mainSheet = XLSX.utils.aoa_to_sheet(data);
        const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(workbook, mainSheet, '主要结果');
        XLSX.utils.book_append_sheet(workbook, detailSheet, '详细数据分析');
        
        // 保存文件
        XLSX.writeFile(workbook, `${userName}_WCST_Results.xlsx`);
    }

    // Event Listeners
    startButton.addEventListener('click', startTest);
    startRealTestButton.addEventListener('click', startRealTest);
    exportButton.addEventListener('click', exportToExcel);
});