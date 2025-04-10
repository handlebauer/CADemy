<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';

	let canvasElement: HTMLCanvasElement;
	let renderer: THREE.WebGLRenderer;
	let scene: THREE.Scene;
	let camera: THREE.OrthographicCamera;
	let cube: THREE.Mesh;
	let animationFrameId: number;

	onMount(() => {
		console.log('Equation Arena component mounted, setting up Three.js');

		// 1. Scene
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0xeeeeee);

		// 2. Camera (Orthographic)
		const aspect = canvasElement.clientWidth / canvasElement.clientHeight;
		const frustumSize = 10;
		camera = new THREE.OrthographicCamera(
			(frustumSize * aspect) / -2,
			(frustumSize * aspect) / 2,
			frustumSize / 2,
			frustumSize / -2,
			1,
			1000
		);
		camera.position.z = 5;

		// 3. Renderer
		renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
		renderer.setSize(canvasElement.clientWidth, canvasElement.clientHeight);
		renderer.setPixelRatio(window.devicePixelRatio);

		// 4. Simple Content (Rotating Cube)
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
		cube = new THREE.Mesh(geometry, material);
		scene.add(cube);

		// 5. Animation Loop
		const animate = () => {
			animationFrameId = requestAnimationFrame(animate);

			// Simple animation
			cube.rotation.x += 0.01;
			cube.rotation.y += 0.01;

			renderer.render(scene, camera);
		};

		animate();

		// Handle resizing
		const resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				const { width, height } = entry.contentRect;
				const aspect = width / height;
				camera.left = (frustumSize * aspect) / -2;
				camera.right = (frustumSize * aspect) / 2;
				camera.top = frustumSize / 2;
				camera.bottom = frustumSize / -2;
				camera.updateProjectionMatrix();
				renderer.setSize(width, height);
			}
		});

		resizeObserver.observe(canvasElement.parentElement || canvasElement);

		// Cleanup logic is now part of onDestroy
	});

	onDestroy(() => {
		console.log('Equation Arena component destroyed, cleaning up Three.js');
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
		if (renderer) {
			renderer.dispose();
		}
		// Optional: Dispose geometry/material if necessary
		// scene.traverse(...) dispose logic etc.
	});
</script>

<!-- Make the container relative for absolute positioning inside -->
<div class="minigame-container">
	<!-- Canvas is now the primary element -->
	<canvas bind:this={canvasElement} class="minigame-canvas"></canvas>

	<h2 class="overlay-title">Equation Arena</h2>
</div>

<style>
	.minigame-container {
		position: relative; /* Needed for absolute positioning of children */
		width: 100%;
		height: 100%;
		overflow: hidden; /* Prevent content spilling */
		background-color: #eeeeee; /* Background now set here if needed */
	}

	.minigame-canvas {
		display: block;
		width: 100%;
		height: 100%;
		/* No border needed now */
	}

	.overlay-title {
		position: absolute;
		top: 1rem;
		left: 50%;
		transform: translateX(-50%);
		color: #333;
		background-color: rgba(255, 255, 255, 0.7);
		padding: 0.5rem 1rem;
		border-radius: 4px;
		pointer-events: none; /* Allow clicks through */
		margin: 0;
		z-index: 1;
	}
</style>
