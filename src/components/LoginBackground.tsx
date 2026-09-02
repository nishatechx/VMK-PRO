import React, { useEffect, useRef } from 'react';

export const LoginBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle nodes tailored strictly to the software's Amber Gold & Deep Navy palette
    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      pulse: number;
      pulseSpeed: number;
      color: string;
      glowColor: string;
    }

    interface CircuitBeam {
      x: number;
      y: number;
      length: number;
      speed: number;
      angle: number;
      color: string;
    }

    const colors = [
      { base: 'rgba(245, 158, 11, ', glow: 'rgba(251, 191, 36, 0.4)' }, // Amber
      { base: 'rgba(217, 119, 6, ', glow: 'rgba(245, 158, 11, 0.3)' }, // Warm Gold
      { base: 'rgba(56, 189, 248, ', glow: 'rgba(14, 165, 233, 0.35)' }, // Electric Sky
      { base: 'rgba(253, 230, 138, ', glow: 'rgba(254, 243, 199, 0.5)' }, // Soft Amber White
    ];

    const nodeCount = Math.max(35, Math.min(70, Math.floor((width * height) / 18000)));
    const nodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.025,
        color: col.base,
        glowColor: col.glow,
      });
    }

    // Floating subtle data beams across the grid
    const beams: CircuitBeam[] = [];
    for (let i = 0; i < 8; i++) {
      beams.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: 40 + Math.random() * 80,
        speed: 0.8 + Math.random() * 1.5,
        angle: Math.random() > 0.5 ? 0 : Math.PI / 2, // horizontal or vertical
        color: Math.random() > 0.4 ? 'rgba(245, 158, 11, 0.6)' : 'rgba(56, 189, 248, 0.5)',
      });
    }

    // Mouse responsiveness
    let mouseX = -1000;
    let mouseY = -1000;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle digital coordinate matrix grid
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 64;
      const startX = 0;
      const startY = 0;

      for (let x = startX; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = startY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Draw subtle moving circuit beams along grid lines
      beams.forEach((beam) => {
        if (beam.angle === 0) {
          beam.x += beam.speed;
          if (beam.x > width + 100) beam.x = -100;
          const grad = ctx.createLinearGradient(beam.x - beam.length, beam.y, beam.x, beam.y);
          grad.addColorStop(0, 'rgba(245, 158, 11, 0)');
          grad.addColorStop(1, beam.color);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(beam.x - beam.length, beam.y);
          ctx.lineTo(beam.x, beam.y);
          ctx.stroke();
        } else {
          beam.y += beam.speed;
          if (beam.y > height + 100) beam.y = -100;
          const grad = ctx.createLinearGradient(beam.x, beam.y - beam.length, beam.x, beam.y);
          grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          grad.addColorStop(1, beam.color);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(beam.x, beam.y - beam.length);
          ctx.lineTo(beam.x, beam.y);
          ctx.stroke();
        }
      });

      // 3. Connect constellation mesh
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.16;
            ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // 4. Update and draw nodes
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        node.pulse += node.pulseSpeed;
        const currentRadius = node.radius + Math.sin(node.pulse) * 0.6;

        // Interactive mouse push
        const mdx = mouseX - node.x;
        const mdy = mouseY - node.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 120 && mdist > 0) {
          const force = (1 - mdist / 120) * 0.8;
          node.x -= (mdx / mdist) * force * 1.5;
          node.y -= (mdy / mdist) * force * 1.5;
        }

        // Glow halo
        ctx.fillStyle = node.glowColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `${node.color}0.85)`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(0.5, currentRadius), 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div id="login-background-wrapper" className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      {/* 1. Deep Obsidian & Midnight Navy Canvas Foundation */}
      <div className="absolute inset-0 bg-[#020617]" />

      {/* 2. Soft Ambient Radial Light Cones (Amber Gold & Electric Blue matching Terminal Scheme) */}
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-amber-600/10 via-sky-600/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-sky-500/15 rounded-full blur-[130px] pointer-events-none" />

      {/* 3. Subtle Cyber Circuit Backdrop Geometry */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.4) 1px, transparent 1px),
            linear-gradient(to right, rgba(245, 158, 11, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px, 48px 48px, 48px 48px',
        }}
      />

      {/* 4. Canvas Particle Constellation & Beam Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-auto" />

      {/* 5. Smooth Vignette at Edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/80 pointer-events-none" />
    </div>
  );
};
