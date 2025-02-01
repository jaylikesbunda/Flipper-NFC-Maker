const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');

let particlesArray;
let isDarkTheme = true; // Default to dark theme

// Function to get current theme colors
function getThemeColors() {
    return isDarkTheme ? {
        particleColor: 'rgba(255, 102, 0, 0.8)',
        backgroundColor: 'rgba(13, 13, 13, 0.8)'
    } : {
        particleColor: 'rgba(255, 102, 0, 0.8)',
        backgroundColor: 'rgba(255, 255, 255, 0.8)'
    };
}

let mouse = {
    x: null,
    y: null,
    radius: (canvas.height / 80) * (canvas.width / 80)
};

// Theme change observer
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('light-theme')) {
            isDarkTheme = false;
        } else {
            isDarkTheme = true;
        }
    });
});

// Start observing theme changes
observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
});

// Create Particle
class Particle {
    constructor(x, y, directionX, directionY, size, color){
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
    }

    // Draw particle
    draw(){
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = getThemeColors().particleColor;
        ctx.fill();
    }

    // Update particle position
    update(){
        if (this.x > canvas.width || this.x < 0){
            this.directionX = -this.directionX;
        }
        if (this.y > canvas.height || this.y < 0){
            this.directionY = -this.directionY;
        }

        // Move particle
        this.x += this.directionX;
        this.y += this.directionY;

        // Draw particle
        this.draw();
    }
}

// Create particle array
function init(){
    particlesArray = [];
    let numberOfParticles = (canvas.height * canvas.width) / 9000;
    for (let i = 0; i < numberOfParticles; i++){
        let size = (Math.random() * 2) + 1;
        let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
        let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
        let directionX = (Math.random() * 1) - 0.5;
        let directionY = (Math.random() * 1) - 0.5;
        let color = getThemeColors().particleColor;

        particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
    }
}

// Animation loop
function animate(){
    requestAnimationFrame(animate);
    const colors = getThemeColors();
    ctx.fillStyle = colors.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particlesArray.forEach(particle => {
        particle.update();
    });

    connect();
}

// Check if particles are close enough to draw a line
function connect(){
    let opacityValue = 1;
    const colors = getThemeColors();
    for (let a = 0; a < particlesArray.length; a++){
        for (let b = a; b < particlesArray.length; b++){
            let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                         + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
            if (distance < (canvas.width / 7) * (canvas.height / 7)){
                opacityValue = 1 - (distance / 20000);
                ctx.strokeStyle = colors.particleColor.replace('0.8', opacityValue);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                ctx.stroke();
            }
        }
    }
}

// Resize Canvas
window.addEventListener('resize', function(){
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    mouse.radius = (canvas.height / 80) * (canvas.width / 80);
    init();
});

// Mouse Move Event
window.addEventListener('mousemove', function(event){
    mouse.x = event.x;
    mouse.y = event.y;
});

// Adjust canvas size and initialize particles
canvas.width = innerWidth;
canvas.height = innerHeight;
init();
animate();
