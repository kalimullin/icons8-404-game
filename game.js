document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] DOMContentLoaded triggered');
    
    // Loading screen logic
    const loadingScreen = document.getElementById('loading-screen');
    const minLoadingTime = 2000; // Minimum time to display loading screen (2 seconds)
    const startTime = Date.now();
    
    // Function to hide loading screen
    function hideLoadingScreen() {
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        
        if (elapsedTime < minLoadingTime) {
            // If less than minimum time has passed, wait for remaining time
            setTimeout(hideLoadingScreen, minLoadingTime - elapsedTime);
            return;
        }
        
        loadingScreen.classList.add('hidden');
        // Remove loading screen after animation completion
        setTimeout(() => {
            loadingScreen.remove();
        }, 200); // Reduce time before removing element
    }
    
    // Start hiding loading screen after all resources are loaded
    window.addEventListener('load', hideLoadingScreen);
    
    // Get DOM elements
    const gameArea = document.getElementById('game-area');
    const bird = document.getElementById('bird');
    const scoreDisplay = document.getElementById('score');
    const startMessage = document.getElementById('start-message');
    const gameOverMessage = document.getElementById('game-over');
    const finalScoreDisplay = document.getElementById('final-score');
    const jumpButton = document.querySelector('.jump-button');
    const restartButton = document.querySelector('.restart-button');
    
    // Detect user's browser
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    console.log('[DEBUG] Browser Safari:', isSafari);
    
    // Audio setup
    let audioContext = null;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('[DEBUG] Error creating AudioContext:', e);
    }
    
    // Animation IDs
    let animationFrameId = null;
    let demoAnimationId = null;
    
    // GAME SETTINGS
    // Gravity and jump settings
    const gravity = 0.4;        // Increased gravity for all browsers
    const jumpStrength = -7;    // Stronger jump
    
    // Pipe settings
    const pipeWidth = 52;
    const pipeGap = 170; // Reduced gap between top and bottom pipes
    const pipeInterval = 1300; // Reduced interval for more frequent pipe spawning
    
    // Speed settings
    const baseSpeed = isSafari ? 3.5 : 3.8; // Increased speed for Chrome
    
    // Time and animation settings
    let lastUpdateTime = 0;
    let gracePeriod = 50;  // Period without collision checks at game start
    
    // Game state
    let gameStarted = false;
    let gameOver = false;
    let canRestartGame = true; // New flag to control restart ability
    let score = 0;
    let birdY = gameArea.clientHeight / 2;
    let birdVelocity = 0;
    let pipes = [];
    let lastPipeTime = 0;

    // Sound settings
    let isSoundEnabled = true;
    
    // Update game dimensions on window resize
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
        
        console.log('[DEBUG] Dimensions updated, scale:', scale);
    }
    
    window.addEventListener('resize', updateGameDimensions);

    // Function for playing sound
    function playSound(frequency, volume = 0.1, duration = 0.08) {
        if (!audioContext) return;
        
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Use triangle wave for soft sound
            oscillator.type = 'triangle';
            
            // Set sound frequency
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            
            // Set volume
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (e) {
            console.log('[DEBUG] Sound playback error:', e);
        }
    }
    
    // Function for jump sound
    function playJumpSound() {
        if (!audioContext) return;
        
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Use triangle wave for very soft sound
            oscillator.type = 'triangle';
            
            // Very short and high sound, like "peew"
            oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(2400, audioContext.currentTime + 0.06);
            
            // Very soft attack and decay
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.08);
            
            console.log('[DEBUG] Jump sound played');
        } catch (e) {
            console.log('[DEBUG] Jump sound playback error:', e);
        }
    }
    
    // Check for required DOM elements
    if (!gameArea || !bird || !scoreDisplay || !startMessage || !gameOverMessage) {
        console.error('Failed to find required DOM elements');
        return;
    }
    
    console.log('[DEBUG] All DOM elements found');
    
    // Game initialization
    function init() {
        console.log('[DEBUG] Game initialization');
        
        // Reset state
        gameStarted = false;
        gameOver = false;
        score = 0;
        scoreDisplay.textContent = '0';
        
        // Hide game over message
        gameOverMessage.classList.add('hidden');
        
        // Show start message
        startMessage.classList.remove('hidden');
        
        // Set initial bird position
        birdY = gameArea.clientHeight * 0.4;
        birdVelocity = 0;
        bird.style.top = Math.floor(birdY) + 'px';
        bird.style.transform = 'translateY(-50%) rotate(0deg)';
        
        // Remove all existing pipes
        pipes.forEach(pipe => {
            if (pipe.top.parentNode) gameArea.removeChild(pipe.top);
            if (pipe.bottom.parentNode) gameArea.removeChild(pipe.bottom);
        });
        pipes = [];
        
        // Create demo scene
        createDemoScene();
    }
    
    // Create demo scene
    function createDemoScene() {
        console.log('[DEBUG] Creating demo scene');
        
        // Create pipes, first one should be visible immediately
        createPipeAt(gameArea.clientWidth * 0.7); // First pipe visible on screen at load
        createPipeAt(gameArea.clientWidth * 1.3); // Second pipe prepared on the right
        
        birdY = gameArea.clientHeight * 0.4;
        bird.style.top = Math.floor(birdY) + 'px';
        
        animateBirdManually();
    }
    
    // Manual bird animation instead of CSS
    function animateBirdManually() {
        console.log('[DEBUG] Starting manual bird animation');
        
        let time = 0;
        const animationDuration = 2000; // 2 seconds
        
        function animate() {
            if (gameStarted) return;
            
            time += 16; // approximately 60 fps
            if (time > animationDuration) time = 0;
            
            // Bird animation only
            const progress = time / animationDuration;
            const offset = Math.sin(progress * Math.PI * 2) * 20;
            const rotation = Math.sin(progress * Math.PI * 2) * 5;
            
            bird.style.top = Math.floor(birdY + offset) + 'px';
            bird.style.transform = `translateY(-50%) rotate(${rotation}deg)`;
            
            demoAnimationId = requestAnimationFrame(animate);
        }
        
        demoAnimationId = requestAnimationFrame(animate);
    }
    
    // Create pipe at specified position (for demo scene)
    function createPipeAt(xPosition) {
        console.log('[DEBUG] Creating pipe at position:', xPosition);
        const pipeTop = document.createElement('div');
        const pipeBottom = document.createElement('div');
        
        pipeTop.className = 'pipe pipe-top';
        pipeBottom.className = 'pipe pipe-bottom';
        
        const gameAreaHeight = gameArea.clientHeight;
        
        // Use passed X position
        const baseWidth = 700;
        const scale = Math.min(1, gameArea.clientWidth / baseWidth);
        const currentPipeWidth = Math.floor(pipeWidth * scale);
        
        // For first demo pipe use medium height
        const variation = Math.random();
        let pipeTopHeight;
        
        if (variation < 0.5) {
            // 40-50% height for first demo pipe
            pipeTopHeight = Math.floor(gameAreaHeight * (0.4 + 0.1 * Math.random()));
        } else {
            // 30-40% height for second demo pipe (slightly lower)
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

    // Game start
    function startGame() {
        // Check if loading screen is visible
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            console.log('[DEBUG] Cannot start game while loading screen is visible');
            return;
        }

        if (gameOver) {
            // If game is over, start new game
            resetGame();
        }

        if (gameStarted) return; // Prevent multiple starts

        console.log('[DEBUG] Game start');
        
        // Reset score
        score = 0;
        scoreDisplay.textContent = score;
        
        // Hide start message
        startMessage.classList.add('hidden');
        
        // Set initial bird position and velocity for smooth start
        birdY = gameArea.clientHeight * 0.6;
        birdVelocity = -8; // Reduced initial upward impulse from -12 to -8
        bird.style.top = Math.floor(birdY) + 'px';
        bird.style.transform = 'translateY(-50%) rotate(-25deg)';
        
        // Initialize time and grace period
        lastUpdateTime = performance.now();
        lastPipeTime = Date.now();
        gracePeriod = 120;
        
        // Remove all existing pipes
        pipes.forEach(pipe => {
            if (pipe.top.parentNode) gameArea.removeChild(pipe.top);
            if (pipe.bottom.parentNode) gameArea.removeChild(pipe.bottom);
        });
        pipes = [];
        
        // Create first pipe
        createPipe();
        
        // Show bird
        bird.classList.remove('hidden');
        
        // Set game state
        gameStarted = true;
        gameOver = false;
        
        // Start animation
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(update);
    }

    // Jump function
    function jump() {
        if (gameOver) {
            // If game is over, restart
            resetGame();
            startGame();
            return;
        }
        
        if (!gameStarted) {
            // If game hasn't started, start it
            startGame();
        }
        
        // Set bird velocity for jump
        birdVelocity = jumpStrength;
        
        // Play jump sound
        playJumpSound();
    }

    // Create new pipe
    function createPipe() {
        console.log('[DEBUG] Creating new pipe');
        const pipeTop = document.createElement('div');
        const pipeBottom = document.createElement('div');
        
        pipeTop.className = 'pipe pipe-top';
        pipeBottom.className = 'pipe pipe-bottom';
        
        const gameAreaWidth = gameArea.clientWidth;
        const gameAreaHeight = gameArea.clientHeight;
        
        // Set initial position right of game area
        const startPosition = gameAreaWidth;
        
        const baseWidth = 700;
        const scale = Math.min(1, gameAreaWidth / baseWidth);
        const currentPipeWidth = Math.floor(pipeWidth * scale);
        
        // More varied height settings for pipes
        const minTopHeight = 30;  // Minimum height (reduced)
        const maxTopHeight = gameAreaHeight - pipeGap - 60;  // Maximum pipe height
        
        // Use full range and add randomness
        let variation = Math.random();
        
        // Random distribution: prefer different heights
        // Sometimes very low, sometimes medium, sometimes high
        let pipeTopHeight;
        if (variation < 0.3) {
            // Low pipes (30-40% of range)
            pipeTopHeight = Math.floor(minTopHeight + (maxTopHeight - minTopHeight) * 0.3 * Math.random());
        } else if (variation < 0.7) {
            // Medium pipes (40-60% of range)
            pipeTopHeight = Math.floor(minTopHeight + (maxTopHeight - minTopHeight) * (0.4 + 0.2 * Math.random()));
        } else {
            // High pipes (60-100% of range)
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

    // Game update
    function update(timestamp) {
        if (!gameStarted || gameOver) {
            requestAnimationFrame(update);
            return;
        }

        // Calculate deltaTime and track render time
        if (!timestamp) timestamp = performance.now();
        
        const deltaTime = Math.min(timestamp - lastUpdateTime, 25); // Limit delta for faster animation
        lastUpdateTime = timestamp;

        // Normalized time multiplier with increased base value
        const targetFrameTime = 16; // base frame time (~60 FPS)
        const timeMultiplier = deltaTime / targetFrameTime * 1.2; // Increase time multiplier by 20%
            
        // Decrease grace period
        if (gracePeriod > 0) {
            gracePeriod--;
        }
        
        // Calculate dynamic gravity based on grace period
        const initialGravity = 0.001; // Slightly increased initial gravity
        const gravityTransitionPeriod = 400; // Keep the same transition period
        const currentGravity = gracePeriod > 0 
            ? initialGravity + (gravity - initialGravity) * ((gravityTransitionPeriod - gracePeriod) / gravityTransitionPeriod)
            : gravity;
        
        // Debug output every 30 frames
        if (gracePeriod % 30 === 0) {
            console.log(`[DEBUG] Current gravity: ${currentGravity}, Grace period: ${gracePeriod}`);
        }
        
        // Update bird position with time multiplier and dynamic gravity
        birdVelocity += currentGravity * timeMultiplier;
        birdY += birdVelocity * timeMultiplier;

        // Move bird visually
        bird.style.top = Math.floor(birdY) + 'px';
        
        // Add bird rotation
        const rotationAngle = Math.max(-20, Math.min(20, birdVelocity * 2));
        bird.style.transform = `translateY(-50%) rotate(${rotationAngle}deg)`;
        
        // Create new pipe at intervals
        const currentTime = Date.now();
        if (currentTime - lastPipeTime > pipeInterval) {
            createPipe();
            lastPipeTime = currentTime;
        }
        
        // Update pipes with multiplier
        const effectiveSpeed = baseSpeed * timeMultiplier;
        
        // Iterate pipes to update positions and check collisions
        pipes.forEach((pipe, index) => {
            pipe.x -= effectiveSpeed;
            pipe.top.style.left = Math.floor(pipe.x) + 'px';
            pipe.bottom.style.left = Math.floor(pipe.x) + 'px';
            
            // Check passed pipes for score
            if (!pipe.passed && pipe.x + pipe.width < 50) {
                pipe.passed = true;
                score++;
                scoreDisplay.textContent = score;
                console.log(`[DEBUG] Score: ${score}`);
            }
            
            // Check pipe collisions only after grace period
            if (gracePeriod <= 0) {
                // Configure hitboxes considering bird's visual representation
                const birdTopOffset = 14;    // Top offset for more accurate hitbox
                const birdBottomOffset = 14; // Bottom offset for more accurate hitbox
                const birdSideOffset = 12;   // Side offset
                
                // Real bird position considering transform: translateY(-50%)
                const actualBirdY = birdY - bird.clientHeight / 2;
                
                const hasCollision = 
                    // Check collision with top pipe (reduced collision zone at top)
                    (actualBirdY + birdTopOffset < parseInt(pipe.top.style.height) && 
                    pipe.x < 50 + bird.clientWidth - birdSideOffset && 
                    pipe.x + pipe.width > 50 + birdSideOffset) ||
                    // Check collision with bottom pipe (reduced collision zone at bottom)
                    (actualBirdY + bird.clientHeight - birdBottomOffset > gameArea.clientHeight - parseInt(pipe.bottom.style.height) && 
                    pipe.x < 50 + bird.clientWidth - birdSideOffset && 
                    pipe.x + pipe.width > 50 + birdSideOffset);
                
                if (hasCollision) {
                    console.log('[DEBUG] Collision with pipe');
                    endGame();
                    return;
                }
            }
            
            // Remove pipes that are off screen
            if (pipe.x + pipe.width < 0) {
                gameArea.removeChild(pipe.top);
                gameArea.removeChild(pipe.bottom);
                pipes.splice(index, 1);
            }
        });
        
        // Check boundary collisions - check top boundary after grace period, bottom boundary always
        if (birdY < 0 && gracePeriod <= 0) {
            console.log('[DEBUG] Collision with top boundary, bird position:', birdY);
            endGame();
            return;
        }
        if (birdY + bird.clientHeight > gameArea.clientHeight) {
            console.log('[DEBUG] Collision with bottom boundary, bird position:', birdY);
            endGame();
            return;
        }
        
        // Continue animation update
        requestAnimationFrame(update);
    }

    // End game
    function endGame() {
        if (gameOver) return; // Prevent multiple calls
        
        console.log('[DEBUG] Game over, score:', score);
        
        // Set game over state
        gameStarted = false;
        gameOver = true;
        canRestartGame = false; // Block restart ability
        
        // Stop animation
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        // Update and show game over message
        finalScoreDisplay.textContent = score;
        gameOverMessage.classList.remove('hidden');
        
        // Play game over sound
        playEndGameSound();

        // Add delay before restart is possible
        setTimeout(() => {
            canRestartGame = true;
            console.log('[DEBUG] New game can be started');
        }, 1000);
    }
    
    // Game over sound
    function playEndGameSound() {
        if (!audioContext) return;
        
        try {
            // First sound
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
            
            // Second sound with delay
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
            console.log('[DEBUG] Game over sound playback error:', e);
        }
    }

    // Reset and restart game
    function resetGame() {
        console.log('[DEBUG] Game reset');
        
        // Reset score
        score = 0;
        scoreDisplay.textContent = score;
        
        // Hide game over message
        gameOverMessage.classList.add('hidden');
        
        // Reset game state
        gameStarted = false;
        gameOver = false;
        
        // Set initial bird position
        birdY = gameArea.clientHeight * 0.4;
        birdVelocity = 0;
        bird.style.top = Math.floor(birdY) + 'px';
        bird.style.transform = 'translateY(-50%) rotate(0deg)';
        
        // Remove all existing pipes
        pipes.forEach(pipe => {
            if (pipe.top.parentNode) gameArea.removeChild(pipe.top);
            if (pipe.bottom.parentNode) gameArea.removeChild(pipe.bottom);
        });
        pipes = [];
        
        // Show start message
        startMessage.classList.remove('hidden');
    }

    // Unified event handler
    function handleInteraction(e) {
        console.log('[DEBUG] handleInteraction called, event type:', e.type);
        
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }
        
        // Check if loading screen is visible
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            console.log('[DEBUG] Cannot handle interaction while loading screen is visible');
            return false;
        }
        
        if (!gameStarted) {
            if (gameOver && !canRestartGame) {
                console.log('[DEBUG] Please wait before starting a new game');
                return false;
            }
            startGame();
        } else {
            jump();
        }
        
        return false;
    }

    // Button handlers
    jumpButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if loading screen is visible
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            console.log('[DEBUG] Cannot jump while loading screen is visible');
            return;
        }
        
        if (!gameStarted) {
            if (gameOver && !canRestartGame) {
                console.log('[DEBUG] Please wait before starting a new game');
                return;
            }
            startGame();
        } else {
            jump();
        }
    });

    restartButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if ((gameOver || !gameStarted) && canRestartGame) {
            init();
            startGame();
        }
    });

    // Event handlers
    document.addEventListener('keydown', (e) => {
        console.log('[DEBUG] Key pressed:', e.code || e.keyCode);
        
        if (e.code === 'Space' || e.keyCode === 32) {
            handleInteraction(e);
        }
    }, { capture: true });

    // Add handlers with capture to ensure they execute first
    gameArea.addEventListener('click', handleInteraction, { capture: true });
    gameArea.addEventListener('touchstart', handleInteraction, { passive: false, capture: true });
    
    // Explicitly call setup functions
    updateGameDimensions();
    
    // Initialization on full page load
    if (document.readyState === 'complete') {
        console.log('[DEBUG] Document already loaded, starting initialization');
        init();
    } else {
        window.addEventListener('load', () => {
            console.log('[DEBUG] Load event, starting initialization');
            init();
        });
        
        // Also start initialization immediately
        console.log('[DEBUG] Starting initialization immediately');
        init();
    }
}); 