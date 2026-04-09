const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl");
if (!gl) {
    alert("WebGL not supported in your browser");
    throw new Error("WebGL not supported"); 
}

const vertexData = [
    0, -0.02, 0,
    0.04, -0.02, 0,
    0.04, 0.02, 0,
    0, 0.02, 0,

    0, 0.06, 0,
    -0.12, 0.06, 0,
    -0.12, -0.06, 0,
    0, -0.06, 0
];

const bulletSegments = 20;
const bulletRadius = 0.03; 
const bulletVertexData = [];

bulletVertexData.push(0, 0, 0);
for (let i = 0; i <= bulletSegments; i++) {
    const angle = (i / bulletSegments) * Math.PI * 2;
    const x = Math.cos(angle) * bulletRadius;
    const y = Math.sin(angle) * bulletRadius;
    bulletVertexData.push(x, y, 0);
}

const colorData = [
    1, 0, 0,    // Red (Player 1)
    0, 0, 1,    // Blue (Player 2)
    0, 1, 0,    // green
    1, 1, 0,    // Yellow
    0, 0, 0     // Black
];

const obstacles = [
    { x: -1, y: 0, width: 0.02, height: 2 },//left side
    { x: 0, y: -1.02, width: 2, height: 0.04 },//bottom
    { x: 1, y: 0, width: 0.02, height: 2 },//right side
    {x: 0, y: 1.02, width: 2, height: 0.02}, // top

    { x: -0.6, y: -0.5, width: 0.02, height: 0.6 },
    { x: -0.2, y: 0.5, width: 0.02, height: 0.6 }, 
    { x: 0.2, y: 0.5, width: 0.02, height: 0.6 },  
    { x: 0.6, y: 0.5, width: 0.02, height: 0.6 },  

    { x: -0.6, y: 0, width: 0.02, height: 0.6 },  
    { x: 0.2, y: 0, width: 0.02, height: 0.6 },   
    { x: 0.2, y: 0, width: 0.02, height: 0.6 },   
    { x: -0.6, y: 0, width: 0.02, height: 0.6 },   

    { x: 0.6, y: 0.5, width: 0.02, height: 0.6 }, 
    { x: -0.2, y: -0.5, width: 0.02, height: 0.6 }, 
    { x: -0.2, y: -0.5, width: 0.02, height: 0.6 },  
    { x: 0.6, y: -0.5, width: 0.02, height: 0.6 },  
];

function createRectangleVertices(w, h) {
    return [
        -w/2, -h/2, 0,
        w/2, -h/2, 0,
        w/2, h/2, 0,
        -w/2, h/2, 0
    ];
}


const obstacleVertexData = createRectangleVertices(1, 1);


const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

const bulletBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, bulletBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bulletVertexData), gl.STATIC_DRAW);

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);

const obstacleBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, obstacleBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obstacleVertexData), gl.STATIC_DRAW);

const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec3 aColor;
    uniform vec2 uPosition;
    uniform float uRotation;
    uniform vec2 uScale;
    varying vec3 vColor;

    void main() {
        float cosR = cos(uRotation);
        float sinR = sin(uRotation);
        vec2 scaled = vec2(aPosition.x * uScale.x, aPosition.y * uScale.y);
        vec2 rotated = vec2(
            scaled.x * cosR - scaled.y * sinR,
            scaled.x * sinR + scaled.y * cosR
        );
        vec2 finalPosition = rotated + uPosition;
        
        gl_Position = vec4(finalPosition, 0.0, 1.0);
        vColor = aColor;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    varying vec3 vColor;
    
    void main() {
        gl_FragColor = vec4(vColor, 1.0);
    }
`;

const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);
if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error("Vertex shader error:", gl.getShaderInfoLog(vertexShader));
    gl.deleteShader(vertexShader);
}

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);
if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error("Fragment shader error:", gl.getShaderInfoLog(fragmentShader));
    gl.deleteShader(fragmentShader);
}

const shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);

if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error("Shader program linking error:", gl.getProgramInfoLog(shaderProgram));
}

gl.useProgram(shaderProgram);

const positionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
const colorLocation = gl.getAttribLocation(shaderProgram, "aColor");
const positionLocationUniform = gl.getUniformLocation(shaderProgram, "uPosition");
const rotationLocationUniform = gl.getUniformLocation(shaderProgram, "uRotation");
const scaleLocation = gl.getUniformLocation(shaderProgram, "uScale");

const gameState = {
    scores: [0, 0],
    gameOver: false
};

class Tank {
    constructor(x, y, colorIndex, controls) {
        this.x = x;
        this.y = y;
        this.rotation = colorIndex === 0 ? 0 : Math.PI;
        this.speed = 0.005;
        this.turnSpeed = 0.07;
        this.colorIndex = colorIndex;
        this.controls = controls;
        this.bullets = [];
        this.lastShot = 0;
        this.shootCooldown = 500;
        this.hit = false;
        this.hitTime = 0;
        this.radius = 0.06;       
        this.bodyWidth = 0.24; 
        this.bodyHeight = 0.12; 
        this.bulletBuffer = gl.createBuffer();
    }

    update(keys) {
        if (gameState.gameOver) return;
        
        if (keys[this.controls.up]) {
            this.x += Math.cos(this.rotation) * this.speed;
            this.y += Math.sin(this.rotation) * this.speed;
        }
        if (keys[this.controls.down]) {
            this.x -= Math.cos(this.rotation) * this.speed;
            this.y -= Math.sin(this.rotation) * this.speed;
        }
        if (keys[this.controls.left]) {
            this.rotation -= this.turnSpeed;
        }
        if (keys[this.controls.right]) {
            this.rotation += this.turnSpeed;
        }

        
        this.x = Math.max(-0.93, Math.min(0.93, this.x));
        this.y = Math.max(-0.93, Math.min(0.93, this.y));

        
        const now = performance.now();

        this.bullets = this.bullets.filter(bullet => {
            const vx = Math.cos(bullet.rotation) * bullet.speed;
            const vy = Math.sin(bullet.rotation) * bullet.speed;

            bullet.x += vx;
            bullet.y += vy;

            
            for (const obs of obstacles) {
                const left = obs.x - obs.width / 2;
                const right = obs.x + obs.width / 2;
                const top = obs.y + obs.height / 2;
                const bottom = obs.y - obs.height / 2;

                
                if (
                    bullet.x + bullet.radius > left &&
                    bullet.x - bullet.radius < right &&
                    bullet.y + bullet.radius > bottom &&
                    bullet.y - bullet.radius < top
                ) {
                    
                    const overlapX = Math.min(right - bullet.x, bullet.x - left);
                    const overlapY = Math.min(top - bullet.y, bullet.y - bottom);

                    if (overlapX < overlapY) {
                       
                        bullet.rotation = Math.PI - bullet.rotation;
                    } else {
                        
                        bullet.rotation = -bullet.rotation;
                    }

                    
                    bullet.x += Math.cos(bullet.rotation) * bullet.speed;
                    bullet.y += Math.sin(bullet.rotation) * bullet.speed;
                }
            }

          
            return now - bullet.creationTime < 4000;
        });

       
        this.bullets = this.bullets.filter(bullet => 
            Math.abs(bullet.x) < 1.2 && Math.abs(bullet.y) < 1.2
        );

        
        if (this.hit && performance.now() - this.hitTime > 200) {
            this.hit = false;
        }

        
        for (const obs of obstacles) {
            const left = obs.x - obs.width / 2;
            const right = obs.x + obs.width / 2;
            const top = obs.y + obs.height / 2;
            const bottom = obs.y - obs.height / 2;
        
            if (this.x + this.radius > left &&
                this.x - this.radius < right &&
                this.y + this.radius > bottom &&
                this.y - this.radius < top) {
                
                this.x -= Math.cos(this.rotation) * this.speed;
                this.y -= Math.sin(this.rotation) * this.speed;
            }
        }
    }

    shoot(currentTime) {
        if (gameState.gameOver) return;
        if (currentTime - this.lastShot > this.shootCooldown) {
           
        shootSound.currentTime = 0; 
        shootSound.play().catch(e => console.log("Shoot sound error:", e));
            this.bullets.push({
                x: this.x + Math.cos(this.rotation) * 0.1,
                y: this.y + Math.sin(this.rotation) * 0.1,
                rotation: this.rotation,
                speed: 0.02,
                color: 2,
                radius: bulletRadius,
                creationTime: performance.now()
            });
            this.lastShot = currentTime;
        }
    }

    draw() {
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        if (this.hit) {
            gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 3 * 3 * 4);
        } else {
            gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, this.colorIndex * 3 * 4);
        }
        gl.enableVertexAttribArray(colorLocation);

        gl.uniform2f(positionLocationUniform, this.x, this.y);
        gl.uniform1f(rotationLocationUniform, this.rotation);
        gl.uniform2f(scaleLocation, 1, 1); 
        gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexData.length / 3);

        // Draw bullets
        gl.bindBuffer(gl.ARRAY_BUFFER, bulletBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bulletVertexData), gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 2 * 3 * 4); 
        gl.enableVertexAttribArray(colorLocation);

        this.bullets.forEach(bullet => {
            gl.bindBuffer(gl.ARRAY_BUFFER, bulletBuffer);
            gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(positionLocation);

            gl.uniform2f(positionLocationUniform, bullet.x, bullet.y);
            gl.uniform1f(rotationLocationUniform, 0);
            gl.uniform2f(scaleLocation, 1, 1); 
            gl.drawArrays(gl.TRIANGLE_FAN, 0, bulletVertexData.length / 3);
        });
    }
    if (DEBUG_MODE) {
        gl.uniform2f(positionLocationUniform, this.x, this.y);
        gl.uniform1f(rotationLocationUniform, 0);
        gl.uniform2f(scaleLocation, this.radius*2, this.radius*2);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, bulletVertexData.length / 3);
    }
}

function drawObstacles() {
    gl.bindBuffer(gl.ARRAY_BUFFER, obstacleBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 4 * 3 * 4); 
    gl.enableVertexAttribArray(colorLocation);

    for (const obs of obstacles) {
        gl.uniform2f(positionLocationUniform, obs.x, obs.y);
        gl.uniform1f(rotationLocationUniform, 0);
        gl.uniform2f(scaleLocation, obs.width, obs.height);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }
}

function checkBulletCollisions() {
  
    const allBullets = [...tanks[0].bullets, ...tanks[1].bullets];
    const bulletsToRemove = new Set(); 
    
    for (let i = 0; i < allBullets.length; i++) {
        for (let j = i + 1; j < allBullets.length; j++) {
            const b1 = allBullets[i];
            const b2 = allBullets[j];
            
          
            const dx = b1.x - b2.x;
            const dy = b1.y - b2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
          
            if (distance < b1.radius + b2.radius) {
                bulletsToRemove.add(b1);
                bulletsToRemove.add(b2);
            }
        }
    }

   
    tanks[0].bullets = tanks[0].bullets.filter(b => !bulletsToRemove.has(b));
    tanks[1].bullets = tanks[1].bullets.filter(b => !bulletsToRemove.has(b));
}

function checkTankCollisions() {
    const dx = tanks[0].x - tanks[1].x;
    const dy = tanks[0].y - tanks[1].y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = tanks[0].radius + tanks[1].radius;

    if (distance < minDistance) {
        const overlap = minDistance - distance;
        const directionX = dx / distance;
        const directionY = dy / distance;

        tanks[0].x += directionX * overlap * 0.5;
        tanks[0].y += directionY * overlap * 0.5;
        tanks[1].x -= directionX * overlap * 0.5;
        tanks[1].y -= directionY * overlap * 0.5;
    }
}
function checkCollisions() {
    if (gameState.gameOver) return;

    for (let i = 0; i < tanks.length; i++) {
        for (let j = 0; j < tanks.length; j++) {
            if (i !== j) {
                tanks[j].bullets.forEach((bullet, index) => {
                    const tank = tanks[i];
                    
                   
                    const dx = tank.x - bullet.x;
                    const dy = tank.y - bullet.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    
                    if (distance < tank.radius + bullet.radius) {
                        
                        hitSound.currentTime = 0;
                        hitSound.play().catch(e => console.log("Hit sound error:", e));
                        
                        tank.hit = true;
                        tank.hitTime = performance.now();
                        tanks[j].bullets.splice(index, 1);
                        
                        gameState.scores[j]++;
                        updateScoreboard();

                        if (gameState.scores[j] >= 5) {
                            gameState.gameOver = true;
                            showGameOverMenu();
                            toggleBackgroundMusic(false);
                        } else {
                            setTimeout(() => {
                                tank.x = i === 0 ? -0.73 : 0.73;
                                tank.y = 0;
                                tank.rotation = i === 0 ? 0 : Math.PI;
                            }, 500);
                        }
                    }
                });
            }
        }
    }
}

const tanks = [
    new Tank(-0.73, 0, 0, { up: "w", down: "s", left: "d", right: "a", shoot: " " }),
    new Tank(0.73, 0, 1, { up: "ArrowUp", down: "ArrowDown", right: "ArrowLeft",  left:"ArrowRight", shoot: "Enter" })
];

const keys = {};
document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === " ") tanks[0].shoot(performance.now());
    if (e.key === "Enter") tanks[1].shoot(performance.now());
});
document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

function updateScoreboard() {
    document.getElementById("scoreboard").textContent =
        `Player 1: ${gameState.scores[0]} - Player 2: ${gameState.scores[1]}`;
}

document.getElementById("resetButton").addEventListener("click", () => {
    resetGame();
});

document.getElementById("closeButton").addEventListener("click", () => {
    window.close(); 
});
function showGameOverMenu() {
    const winnerText = document.getElementById("winnerText");
    if (gameState.scores[0] >= 5) {
        winnerText.textContent = "Player 1 Wins!";
        winnerText.style.color = "#ff5555";
    } else {
        winnerText.textContent = "Player 2 Wins!";
        winnerText.style.color = "#5555ff";
    }
    const menu = document.getElementById("gameOverText");
    menu.style.display = "block";
    setTimeout(() => menu.classList.add("show"), 10);
}

function hideGameOverMenu() {
    const menu = document.getElementById("gameOverText");
    menu.classList.remove("show");
    setTimeout(() => menu.style.display = "none", 300);
}


function resetGame() {
    gameState.scores = [0, 0];
    gameState.gameOver = false;
    updateScoreboard();
    hideGameOverMenu();

    tanks[0].x = -0.9;
    tanks[0].y = 0;
    tanks[0].rotation = 0;
    tanks[0].bullets = [];
    tanks[0].hit = false;

    tanks[1].x = 0.9;
    tanks[1].y = 0;
    tanks[1].rotation = Math.PI;
    tanks[1].bullets = [];
    tanks[1].hit = false;
}

const backgroundMusic = document.getElementById('backgroundMusic');
const shootSound = document.getElementById('shootSound');
const hitSound = document.getElementById('hitSound');


backgroundMusic.volume = 0.3; 
shootSound.volume = 0.7;
hitSound.volume = 0.8;


function toggleBackgroundMusic(play) {
    if (play) {
        backgroundMusic.play().catch(e => console.log("Audio play prevented:", e));
    } else {
        backgroundMusic.pause();
    }
}
const musicToggle = document.getElementById('musicToggle');
let musicOn = true;

musicToggle.addEventListener('click', () => {
    musicOn = !musicOn;
    musicToggle.textContent = `Music: ${musicOn ? 'ON' : 'OFF'}`;
    toggleBackgroundMusic(musicOn);
});


toggleBackgroundMusic(musicOn);


function gameLoop() {
    tanks.forEach(tank => tank.update(keys));
    checkCollisions();
    checkBulletCollisions();
    checkTankCollisions();
    
    drawObstacles();
    tanks.forEach(tank => tank.draw());
    
    requestAnimationFrame(gameLoop);
    toggleBackgroundMusic(true);
}

updateScoreboard();
gameLoop();

