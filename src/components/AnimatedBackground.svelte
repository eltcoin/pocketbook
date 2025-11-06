<script>
  import { onMount } from 'svelte';
  import { themeStore } from '../stores/theme';

  let canvas;
  let ctx;
  let stars = [];
  let animationId;
  let darkMode = false;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  class Star {
    constructor(width, height) {
      this.x = Math.random() * width - width / 2;
      this.y = Math.random() * height - height / 2;
      this.z = Math.random() * 1000;
      this.size = Math.random() * 2 + 0.5;
    }

    update(speed) {
      this.z -= speed;
      if (this.z <= 0) {
        this.z = 1000;
      }
    }

    draw(ctx, width, height, darkMode) {
      const x = (this.x / this.z) * 200 + width / 2;
      const y = (this.y / this.z) * 200 + height / 2;
      const size = (1 - this.z / 1000) * this.size;
      const opacity = (1 - this.z / 1000);

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      
      if (darkMode) {
        ctx.fillStyle = `rgba(241, 245, 249, ${opacity * 0.8})`;
      } else {
        ctx.fillStyle = `rgba(100, 116, 139, ${opacity * 0.3})`;
      }
      ctx.fill();
    }
  }

  function initStars() {
    const width = canvas.width;
    const height = canvas.height;
    stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push(new Star(width, height));
    }
  }

  function animate() {
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    stars.forEach(star => {
      star.update(0.5);
      star.draw(ctx, canvas.width, canvas.height, darkMode);
    });

    animationId = requestAnimationFrame(animate);
  }

  function handleResize() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    }
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    handleResize();
    animate();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  });
</script>

<canvas bind:this={canvas} class="animated-bg"></canvas>

<style>
  .animated-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
  }
</style>
