document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] DOMContentLoaded сработал');
    
    // Получаем элементы DOM
    const gameArea = document.getElementById('game-area');
    const bird = document.getElementById('bird');
    const scoreDisplay = document.getElementById('score');
    const startMessage = document.getElementById('start-message');
    const gameOverMessage = document.getElementById('game-over');
    const finalScoreDisplay = document.getElementById('final-score');
    const jumpButton = document.querySelector('.jump-button');
    const restartButton = document.querySelector('.restart-button');
    
    // Определяем браузер пользователя
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    console.log('[DEBUG] Браузер Safari:', isSafari);
    
    // Настройка звука
    let audioContext = null;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('[DEBUG] Ошибка создания AudioContext:', e);
    }
    
    // ID для анимации
    let animationFrameId = null;
    let demoAnimationId = null;
    
    // НАСТРОЙКИ ИГРЫ
    // Настройки для гравитации и прыжка
    const gravity = 0.4;        // Увеличенная гравитация для всех браузеров
    const jumpStrength = -7;    // Более сильный прыжок
    
    // Настройка труб
    const pipeWidth = 52;
    const pipeGap = 170; // Уменьшенный промежуток между верхней и нижней трубой
    const pipeInterval = 1300; // Уменьшен интервал для более частого появления труб
    
    // Настройка скорости
    const baseSpeed = isSafari ? 3.5 : 3.8; // Увеличена скорость для Chrome
    
    // Настройка времени и анимации
    let lastUpdateTime = 0;
    let gracePeriod = 50;  // Период без проверки столкновений в начале игры
    
    // Состояние игры
    let gameStarted = false;
    let gameOver = false;
    let score = 0;
    let birdY = gameArea.clientHeight / 2;
    let birdVelocity = 0;
    let pipes = [];
    let lastPipeTime = 0;

    // Настройка звука
    let isSoundEnabled = true;
    
    // Обновляем размеры при изменении окна
    function updateGameDimensions() {
        gameAreaWidth = gameArea.clientWidth;
        
        const baseWidth = 700;
        const scale = Math.min(1, gameAreaWidth / baseWidth);
        
        if (scale < 1) {
            bird.style.width = Math.floor(50 * scale) + 'px';
            bird.style.height = Math.floor(50 * scale) + 'px';
        } else {
            bird.style.width = '50px';
            bird.style.height = '50px';
        }
        
        document.querySelectorAll('.pipe').forEach(pipe => {
            if (scale < 1) {
                pipe.style.width = Math.floor(60 * scale) + 'px';
            } else {
                pipe.style.width = '60px';
            }
        });
        
        console.log('[DEBUG] Размеры обновлены, scale:', scale);
    }
    
    window.addEventListener('resize', updateGameDimensions);

    // Функция для воспроизведения звука
    function playSound(frequency, volume = 0.1, duration = 0.08) {
        if (!audioContext) return;
        
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Используем треугольную волну для мягкого звучания
            oscillator.type = 'triangle';
            
            // Настраиваем частоту звука
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            
            // Настраиваем громкость
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (e) {
            console.log('[DEBUG] Ошибка воспроизведения звука:', e);
        }
    }
    
    // Функция для звука прыжка
    function playJumpSound() {
        if (!audioContext) return;
        
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Используем треугольную волну для очень мягкого звучания
            oscillator.type = 'triangle';
            
            // Очень короткий и высокий звук, как "пиу"
            oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(2400, audioContext.currentTime + 0.06);
            
            // Очень мягкая атака и затухание
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.08);
            
            console.log('[DEBUG] Звук прыжка воспроизведен');
        } catch (e) {
            console.log('[DEBUG] Ошибка воспроизведения звука:', e);
        }
    }
    
    // Проверка наличия необходимых элементов DOM
    if (!gameArea || !bird || !scoreDisplay || !startMessage || !gameOverMessage) {
        console.error('Не удалось найти необходимые элементы DOM');
        return;
    }
    
    console.log('[DEBUG] Все DOM элементы найдены');
    
    // Инициализация игры
    function init() {
        console.log('[DEBUG] Инициализация игры');
        
        // Сбрасываем состояние
        gameStarted = false;
        gameOver = false;
        score = 0;
        scoreDisplay.textContent = '0';
        
        // Скрываем сообщение о конце игры
        gameOverMessage.classList.add('hidden');
        
        // Показываем стартовое сообщение
        startMessage.classList.remove('hidden');
        
        // Устанавливаем начальную позицию птицы
        birdY = gameArea.clientHeight * 0.4;
        birdVelocity = 0;
        bird.style.top = Math.floor(birdY) + 'px';
        bird.style.transform = 'translateY(-50%) rotate(0deg)';
        
        // Удаляем все существующие трубы
        pipes.forEach(pipe => {
            if (pipe.top.parentNode) gameArea.removeChild(pipe.top);
            if (pipe.bottom.parentNode) gameArea.removeChild(pipe.bottom);
        });
        pipes = [];
        
        // Создаем демо-сцену
        createDemoScene();
    }
    
    // Создание демонстрационной сцены
    function createDemoScene() {
        console.log('[DEBUG] Создание демо-сцены');
        
        // Создаем трубы, первая должна быть видна сразу
        createPipeAt(gameArea.clientWidth * 0.7); // Первая труба видна на экране при загрузке
        createPipeAt(gameArea.clientWidth * 1.3); // Вторая труба подготовлена справа
        
        birdY = gameArea.clientHeight * 0.4;
        bird.style.top = Math.floor(birdY) + 'px';
        
        animateBirdManually();
    }
    
    // Ручная анимация птицы вместо CSS
    function animateBirdManually() {
        console.log('[DEBUG] Запуск ручной анимации птицы');
        
        let time = 0;
        const animationDuration = 2000; // 2 секунды
        
        function animate() {
            if (gameStarted) return;
            
            time += 16; // примерно 60 fps
            if (time > animationDuration) time = 0;
            
            // Анимация только птицы
            const progress = time / animationDuration;
            const offset = Math.sin(progress * Math.PI * 2) * 20;
            const rotation = Math.sin(progress * Math.PI * 2) * 5;
            
            bird.style.top = Math.floor(birdY + offset) + 'px';
            bird.style.transform = `translateY(-50%) rotate(${rotation}deg)`;
            
            demoAnimationId = requestAnimationFrame(animate);
        }
        
        demoAnimationId = requestAnimationFrame(animate);
    }
    
    // Создание трубы в указанной позиции (для демо-сцены)
    function createPipeAt(xPosition) {
        console.log('[DEBUG] Создание трубы в позиции:', xPosition);
        const pipeTop = document.createElement('div');
        const pipeBottom = document.createElement('div');
        
        pipeTop.className = 'pipe pipe-top';
        pipeBottom.className = 'pipe pipe-bottom';
        
        const gameAreaHeight = gameArea.clientHeight;
        
        // Используем переданную позицию X
        const baseWidth = 700;
        const scale = Math.min(1, gameArea.clientWidth / baseWidth);
        const currentPipeWidth = Math.floor(pipeWidth * scale);
        
        // Для первой демонстрационной трубы используем среднюю высоту
        const variation = Math.random();
        let pipeTopHeight;
        
        if (variation < 0.5) {
            // 40-50% высоты для первой демо-трубы
            pipeTopHeight = Math.floor(gameAreaHeight * (0.4 + 0.1 * Math.random()));
        } else {
            // 30-40% высоты для второй демо-трубы (немного ниже)
            pipeTopHeight = Math.floor(gameAreaHeight * (0.3 + 0.1 * Math.random()));
        }
        
        const roundedTopHeight = Math.floor(pipeTopHeight / 8) * 8;
        
        pipeTop.style.height = roundedTopHeight + 'px';
        pipeTop.style.left = xPosition + 'px';
        pipeTop.style.width = currentPipeWidth + 'px';
        
        const pipeBottomHeight = gameAreaHeight - roundedTopHeight - pipeGap;
        const roundedBottomHeight = Math.floor(pipeBottomHeight / 8) * 8;
        
        pipeBottom.style.height = roundedBottomHeight + 'px';
        pipeBottom.style.left = xPosition + 'px';
        pipeBottom.style.width = currentPipeWidth + 'px';
        
        gameArea.appendChild(pipeTop);
        gameArea.appendChild(pipeBottom);
        
        pipes.push({
            top: pipeTop,
            bottom: pipeBottom,
            x: xPosition,
            passed: false,
            width: currentPipeWidth
        });
    }

    // Начало игры
    function startGame() {
        if (gameOver) {
            // Если игра уже закончилась, то начинаем заново
            resetGame();
        }

        if (gameStarted) return; // Предотвращаем повторный запуск

        console.log('[DEBUG] Начало игры');
        
        // Сбрасываем счетчик
        score = 0;
        scoreDisplay.textContent = score;
        
        // Скрываем стартовое сообщение
        startMessage.classList.add('hidden');
        
        // Устанавливаем начальную позицию птицы 
        birdY = gameArea.clientHeight * 0.4;
        birdVelocity = 0;
        bird.style.top = Math.floor(birdY) + 'px';
        bird.style.transform = 'translateY(-50%) rotate(0deg)';
        
        // Инициализируем время и защитный период
        lastUpdateTime = performance.now();
        lastPipeTime = Date.now();
        gracePeriod = isSafari ? 70 : 50; // Больше защитное время для Safari
        
        // Удаляем все существующие трубы
        pipes.forEach(pipe => {
            if (pipe.top.parentNode) gameArea.removeChild(pipe.top);
            if (pipe.bottom.parentNode) gameArea.removeChild(pipe.bottom);
        });
        pipes = [];
        
        // Создаем первую трубу
        createPipe();
        
        // Показываем птицу
        bird.classList.remove('hidden');
        
        // Устанавливаем игровое состояние
        gameStarted = true;
        gameOver = false;
        
        // Запускаем анимацию
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(update);
    }

    // Функция прыжка
    function jump() {
        if (gameOver) {
            // Если игра окончена, то перезапускаем
            resetGame();
            startGame();
            return;
        }
        
        if (!gameStarted) {
            // Если игра не началась, то запускаем
            startGame();
        }
        
        // Устанавливаем скорость птицы для прыжка
        birdVelocity = jumpStrength;
        
        // Воспроизводим звук прыжка
        playJumpSound();
    }

    // Создание новой трубы
    function createPipe() {
        console.log('[DEBUG] Создание новой трубы');
        const pipeTop = document.createElement('div');
        const pipeBottom = document.createElement('div');
        
        pipeTop.className = 'pipe pipe-top';
        pipeBottom.className = 'pipe pipe-bottom';
        
        const gameAreaWidth = gameArea.clientWidth;
        const gameAreaHeight = gameArea.clientHeight;
        
        // Устанавливаем начальную позицию справа от игрового поля
        const startPosition = gameAreaWidth;
        
        const baseWidth = 700;
        const scale = Math.min(1, gameAreaWidth / baseWidth);
        const currentPipeWidth = Math.floor(pipeWidth * scale);
        
        // Более разнообразные настройки высоты для труб
        const minTopHeight = 30;  // Минимальная высота (уменьшена)
        const maxTopHeight = gameAreaHeight - pipeGap - 60;  // Максимальная высота трубы
        
        // Использование полного диапазона и добавление случайности
        let variation = Math.random();
        
        // Случайное распределение: предпочитаем различные высоты
        // Иногда очень низкие, иногда средние, иногда высокие
        let pipeTopHeight;
        if (variation < 0.3) {
            // Низкие трубы (30-40% от диапазона)
            pipeTopHeight = Math.floor(minTopHeight + (maxTopHeight - minTopHeight) * 0.3 * Math.random());
        } else if (variation < 0.7) {
            // Средние трубы (40-60% от диапазона)
            pipeTopHeight = Math.floor(minTopHeight + (maxTopHeight - minTopHeight) * (0.4 + 0.2 * Math.random()));
        } else {
            // Высокие трубы (60-100% от диапазона)
            pipeTopHeight = Math.floor(minTopHeight + (maxTopHeight - minTopHeight) * (0.6 + 0.4 * Math.random()));
        }
        
        const roundedTopHeight = Math.floor(pipeTopHeight / 8) * 8;
        
        pipeTop.style.height = roundedTopHeight + 'px';
        pipeTop.style.left = startPosition + 'px';
        pipeTop.style.width = currentPipeWidth + 'px';
        
        const pipeBottomHeight = gameAreaHeight - roundedTopHeight - pipeGap;
        const roundedBottomHeight = Math.floor(pipeBottomHeight / 8) * 8;
        
        pipeBottom.style.height = roundedBottomHeight + 'px';
        pipeBottom.style.left = startPosition + 'px';
        pipeBottom.style.width = currentPipeWidth + 'px';
        
        gameArea.appendChild(pipeTop);
        gameArea.appendChild(pipeBottom);
        
        pipes.push({
            top: pipeTop,
            bottom: pipeBottom,
            x: startPosition,
            passed: false,
            width: currentPipeWidth
        });
    }

    // Обновление состояния игры
    function update(timestamp) {
        if (!gameStarted || gameOver) {
            requestAnimationFrame(update);
            return;
        }

        // Вычисляем deltaTime и следим за временем отрисовки
        if (!timestamp) timestamp = performance.now();
        
        const deltaTime = Math.min(timestamp - lastUpdateTime, 25); // Ограничиваем дельту для более быстрой анимации
        lastUpdateTime = timestamp;

        // Нормализованный множитель времени с увеличенным базовым значением
        const targetFrameTime = 16; // базовое время кадра (~60 FPS)
        const timeMultiplier = deltaTime / targetFrameTime * 1.2; // Увеличиваем множитель времени на 20%
            
        // Уменьшаем защитный период
        if (gracePeriod > 0) {
            gracePeriod--;
        }
        
        // Обновляем позицию птицы с учетом множителя времени
        birdVelocity += gravity * timeMultiplier;
        birdY += birdVelocity * timeMultiplier;

        // Перемещаем птицу визуально
        bird.style.top = Math.floor(birdY) + 'px';
        
        // Добавляем покачивание птицы
        const rotationAngle = Math.max(-20, Math.min(20, birdVelocity * 2));
        bird.style.transform = `translateY(-50%) rotate(${rotationAngle}deg)`;
        
        // Создаем новую трубу через интервалы
        const currentTime = Date.now();
        if (currentTime - lastPipeTime > pipeInterval) {
            createPipe();
            lastPipeTime = currentTime;
        }
        
        // Обновляем трубы с учетом множителя
        const effectiveSpeed = baseSpeed * timeMultiplier;
        
        // Перебираем трубы для обновления их позиций и проверки столкновений
        pipes.forEach((pipe, index) => {
            pipe.x -= effectiveSpeed;
            pipe.top.style.left = Math.floor(pipe.x) + 'px';
            pipe.bottom.style.left = Math.floor(pipe.x) + 'px';
            
            // Проверяем пройденные трубы для подсчета очков
            if (!pipe.passed && pipe.x + pipe.width < 50) {
                pipe.passed = true;
                score++;
                scoreDisplay.textContent = score;
                console.log(`[DEBUG] Очки: ${score}`);
            }
            
            // Проверяем столкновения с трубами только если закончился защитный период
            if (gracePeriod <= 0) {
                const hasCollision = 
                    (birdY < parseInt(pipe.top.style.height) + 4 && 
                    pipe.x < 50 + bird.clientWidth - 2 && 
                    pipe.x + pipe.width > 50 + 2) ||
                    (birdY + bird.clientHeight > gameArea.clientHeight - parseInt(pipe.bottom.style.height) + 2 && 
                    pipe.x < 50 + bird.clientWidth - 2 && 
                    pipe.x + pipe.width > 50 + 2);
                
                if (hasCollision) {
                    console.log('[DEBUG] Столкновение с трубой');
                    endGame();
                    return;
                }
            }
            
            // Удаляем трубы, которые вышли за пределы экрана
            if (pipe.x + pipe.width < 0) {
                gameArea.removeChild(pipe.top);
                gameArea.removeChild(pipe.bottom);
                pipes.splice(index, 1);
            }
        });
        
        // Проверяем столкновение с границами после защитного периода
        if (gracePeriod <= 0 && (birdY < 0 || birdY + bird.clientHeight > gameArea.clientHeight)) {
            console.log('[DEBUG] Столкновение с границей, позиция птицы:', birdY);
            endGame();
            return;
        }
        
        // Продолжаем обновление анимации
        requestAnimationFrame(update);
    }

    // Завершение игры
    function endGame() {
        if (gameOver) return; // Защита от повторного вызова
        
        console.log('[DEBUG] Конец игры, счет:', score);
        
        // Устанавливаем состояние конца игры
        gameStarted = false;
        gameOver = true;
        
        // Останавливаем анимацию
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        // Обновляем и показываем сообщение о конце игры
        finalScoreDisplay.textContent = score;
        gameOverMessage.classList.remove('hidden');
        
        // Воспроизводим звук конца игры
        playEndGameSound();
    }
    
    // Звук окончания игры
    function playEndGameSound() {
        if (!audioContext) return;
        
        try {
            // Первый звук
            const oscillator1 = audioContext.createOscillator();
            const gainNode1 = audioContext.createGain();
            
            oscillator1.connect(gainNode1);
            gainNode1.connect(audioContext.destination);
            
            oscillator1.type = 'triangle';
            oscillator1.frequency.setValueAtTime(440, audioContext.currentTime);
            
            gainNode1.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode1.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
            gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator1.start(audioContext.currentTime);
            oscillator1.stop(audioContext.currentTime + 0.5);
            
            // Второй звук с задержкой
            setTimeout(() => {
                const oscillator2 = audioContext.createOscillator();
                const gainNode2 = audioContext.createGain();
                
                oscillator2.connect(gainNode2);
                gainNode2.connect(audioContext.destination);
                
                oscillator2.type = 'triangle';
                oscillator2.frequency.setValueAtTime(330, audioContext.currentTime);
                
                gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode2.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
                gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator2.start(audioContext.currentTime);
                oscillator2.stop(audioContext.currentTime + 0.5);
            }, 300);
        } catch (e) {
            console.log('[DEBUG] Ошибка воспроизведения звука окончания игры:', e);
        }
    }

    // Сброс и перезапуск игры
    function resetGame() {
        console.log('[DEBUG] Сброс игры');
        
        // Сбрасываем счетчик
        score = 0;
        scoreDisplay.textContent = score;
        
        // Скрываем сообщение о конце игры
        gameOverMessage.classList.add('hidden');
        
        // Сбрасываем состояние игры
        gameStarted = false;
        gameOver = false;
        
        // Устанавливаем начальную позицию птицы
        birdY = gameArea.clientHeight * 0.4;
        birdVelocity = 0;
        bird.style.top = Math.floor(birdY) + 'px';
        bird.style.transform = 'translateY(-50%) rotate(0deg)';
        
        // Удаляем все существующие трубы
        pipes.forEach(pipe => {
            if (pipe.top.parentNode) gameArea.removeChild(pipe.top);
            if (pipe.bottom.parentNode) gameArea.removeChild(pipe.bottom);
        });
        pipes = [];
        
        // Показываем стартовое сообщение
        startMessage.classList.remove('hidden');
    }

    // Унифицированный обработчик событий
    function handleInteraction(e) {
        console.log('[DEBUG] Вызван handleInteraction, тип события:', e.type);
        
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }
        
        if (!gameStarted || gameOver) {
            startGame();
        } else {
            jump();
        }
        
        return false;
    }

    // Обработчики для кнопок
    jumpButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!gameStarted || gameOver) {
            startGame();
        } else {
            jump();
        }
    });

    restartButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (gameOver || !gameStarted) {
            init();
            startGame();
        }
    });

    // Обработчики событий
    document.addEventListener('keydown', (e) => {
        console.log('[DEBUG] Нажата клавиша:', e.code || e.keyCode);
        
        if (e.code === 'Space' || e.keyCode === 32) {
            handleInteraction(e);
        }
    }, { capture: true });

    // Добавляем обработчики с захватом, чтобы они выполнялись первыми
    gameArea.addEventListener('click', handleInteraction, { capture: true });
    gameArea.addEventListener('touchstart', handleInteraction, { passive: false, capture: true });
    
    // Явно вызываем функции настройки
    updateGameDimensions();
    
    // Инициализация при полной загрузке страницы
    if (document.readyState === 'complete') {
        console.log('[DEBUG] Документ уже загружен, запускаем инициализацию');
        init();
    } else {
        window.addEventListener('load', () => {
            console.log('[DEBUG] Событие load, запускаем инициализацию');
            init();
        });
        
        // Также запускаем инициализацию сразу
        console.log('[DEBUG] Запускаем инициализацию сразу');
        init();
    }
}); 