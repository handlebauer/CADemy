<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import type { SubjectMapData, LessonNodeData } from '$lib/types/map';

	export let mapData: SubjectMapData;
	export let onNodeInteract: (nodeName: string) => void; // Event dispatcher for interaction

	let canvasElement: HTMLCanvasElement;
	let canvasContainer: HTMLElement;

	let scene: THREE.Scene;
	let camera: THREE.OrthographicCamera; // Orthographic for 2D view
	let renderer: THREE.WebGLRenderer;
	let animationFrameId: number;

	// --- State for Player & Nodes ---
	let playerMesh: THREE.Mesh | null = null; // Will hold the player object
	let currentNodeId: string | null = null; // Track player's current node
	const nodeMeshes = new Map<string, THREE.Mesh>(); // Store node objects

	onMount(() => {
		// --- Basic Three.js Setup ---
		scene = new THREE.Scene();
		scene.background = new THREE.Color(mapData.theme.backgroundColor);

		// Get container dimensions - fall back to window if container not ready
		let containerWidth = window.innerWidth;
		let containerHeight = window.innerHeight * 0.8;

		if (canvasContainer) {
			const containerRect = canvasContainer.getBoundingClientRect();
			if (containerRect.width > 0) containerWidth = containerRect.width;
			if (containerRect.height > 0) containerHeight = containerRect.height;
		}

		// Orthographic Camera for 2D view - adjust parameters as needed
		const aspect = containerWidth / containerHeight || 1; // Fallback to prevent division by zero
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

		renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
		renderer.setSize(containerWidth, containerHeight);

		// --- Create Map Elements ---
		createMapElements();

		// --- Initial Player Position ---
		// Find the first node (or a designated start node)
		if (mapData.nodes.length > 0) {
			const startNode = mapData.nodes[0];
			currentNodeId = startNode.id;
			createOrUpdatePlayer(startNode.position);
		}

		// --- Add Event Listeners ---
		window.addEventListener('resize', handleResize);
		window.addEventListener('keydown', handleKeyDown);
		canvasElement.addEventListener('click', handleCanvasClick); // For mobile tap

		// --- Animation Loop ---
		const animate = () => {
			animationFrameId = requestAnimationFrame(animate);
			// Add any animations here (e.g., smooth player movement)
			renderer.render(scene, camera);
		};
		animate();

		// Cleanup function
		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('keydown', handleKeyDown);
			canvasElement.removeEventListener('click', handleCanvasClick);
			cancelAnimationFrame(animationFrameId);
			// Dispose of Three.js objects (important for preventing memory leaks)
			// scene.traverse(...) dispose geometries, materials, textures
			renderer.dispose();
		};
	});

	// Track the current subject to detect map changes
	let previousSubject = '';

	// Reactive update when mapData changes
	$: {
		if (scene && mapData) {
			const isMapChange = previousSubject !== mapData.subject;
			previousSubject = mapData.subject;

			scene.background = new THREE.Color(mapData.theme.backgroundColor);
			// Clear old map elements and recreate (simple approach for now)
			clearMapElements();
			createMapElements();

			// Only reset player position on initial render or when changing maps
			if (isMapChange) {
				// Reset player to start node of new map
				if (mapData.nodes.length > 0) {
					const startNode = mapData.nodes[0];
					currentNodeId = startNode.id;
					createOrUpdatePlayer(startNode.position);
				} else {
					// Handle empty map case
					if (playerMesh) scene.remove(playerMesh);
					playerMesh = null;
					currentNodeId = null;
				}
			} else if (currentNodeId) {
				// Preserve player position when re-rendering the same map
				const currentNode = mapData.nodes.find((n) => n.id === currentNodeId);
				if (currentNode) {
					// Current node still exists, no need to reposition
				}
			}
		}
	}

	function clearMapElements() {
		nodeMeshes.forEach((mesh) => scene.remove(mesh));
		nodeMeshes.clear();
		// Also remove paths if you draw them separately
		// Example: Remove objects named 'path'
		const objectsToRemove = scene.children.filter(
			(obj) => obj.name === 'path' || obj.name === 'node'
		);
		objectsToRemove.forEach((obj) => scene.remove(obj));
	}

	function createMapElements() {
		// --- Create Nodes ---
		mapData.nodes.forEach((nodeData) => {
			// Basic node representation (e.g., a circle)
			const geometry = new THREE.CircleGeometry(0.3, 32); // Adjust size
			const material = new THREE.MeshBasicMaterial({
				color: new THREE.Color(mapData.theme.pathColor)
			}); // Use theme color
			const nodeMesh = new THREE.Mesh(geometry, material);
			nodeMesh.position.set(nodeData.position.x, nodeData.position.y, 0);
			nodeMesh.userData = { id: nodeData.id, name: nodeData.name, type: 'LessonNode' }; // Store data for click detection
			nodeMesh.name = 'node'; // For easy removal/identification
			scene.add(nodeMesh);
			nodeMeshes.set(nodeData.id, nodeMesh); // Store reference

			// --- Draw Paths ---
			// Connect to other nodes based on nodeData.connections
			nodeData.connections.forEach((connectionId) => {
				const targetNode = mapData.nodes.find((n) => n.id === connectionId);
				// Avoid drawing duplicate paths (e.g., only draw if current node ID < target node ID)
				if (targetNode && nodeData.id < connectionId) {
					const points = [
						new THREE.Vector3(nodeData.position.x, nodeData.position.y, -0.1), // Slightly behind nodes
						new THREE.Vector3(targetNode.position.x, targetNode.position.y, -0.1)
					];
					const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
					const pathMaterial = new THREE.LineBasicMaterial({
						color: new THREE.Color(mapData.theme.pathColor),
						linewidth: 2
					}); // Use theme color
					const pathLine = new THREE.Line(pathGeometry, pathMaterial);
					pathLine.name = 'path'; // For easy removal
					scene.add(pathLine);
				}
			});
		});
	}

	// --- Player Creation / Update ---
	function createOrUpdatePlayer(position: { x: number; y: number }) {
		// Simple player shape (make this modular later for sprites)
		if (!playerMesh) {
			// This is the placeholder for future player avatar/sprite implementation
			const playerGeometry = new THREE.CapsuleGeometry(0.2, 0.4, 4, 8); // Example shape
			const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color
			playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
			playerMesh.position.z = 0.1; // Slightly in front of nodes/paths
			scene.add(playerMesh);
		}

		playerMesh.position.x = position.x;
		playerMesh.position.y = position.y;

		// Trigger interaction event when player lands on a node
		const landedNode = mapData.nodes.find((n) => n.id === currentNodeId);
		if (landedNode) {
			onNodeInteract(landedNode.name);
		}

		// Force a renderer update
		if (renderer) {
			renderer.render(scene, camera);
		}
	}

	// --- Event Handlers ---
	function handleResize() {
		// Get actual container dimensions
		const containerRect = canvasContainer.getBoundingClientRect();
		const width = containerRect.width;
		const height = containerRect.height;

		const aspect = width / height;
		const frustumSize = 10;

		camera.left = (frustumSize * aspect) / -2;
		camera.right = (frustumSize * aspect) / 2;
		camera.top = frustumSize / 2;
		camera.bottom = frustumSize / -2;
		camera.updateProjectionMatrix();

		renderer.setSize(width, height);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!currentNodeId) return;

		const currentNode = mapData.nodes.find((n) => n.id === currentNodeId);
		if (!currentNode) return;

		let targetNodeId: string | undefined = undefined;

		// Basic directional mapping (improve this logic based on actual map layout)
		switch (event.key) {
			case 'ArrowUp':
			case 'w':
				// Find connection mostly 'up' from current node
				event.preventDefault(); // Prevent browser scrolling
				targetNodeId = findConnectionInDirection(currentNode, 0, 1);
				break;
			case 'ArrowDown':
			case 's':
				// Find connection mostly 'down' from current node
				event.preventDefault(); // Prevent browser scrolling
				targetNodeId = findConnectionInDirection(currentNode, 0, -1);
				break;
			case 'ArrowLeft':
			case 'a':
				// Find connection mostly 'left' from current node
				event.preventDefault(); // Prevent browser scrolling
				targetNodeId = findConnectionInDirection(currentNode, -1, 0);
				break;
			case 'ArrowRight':
			case 'd':
				// Find connection mostly 'right' from current node
				event.preventDefault(); // Prevent browser scrolling
				targetNodeId = findConnectionInDirection(currentNode, 1, 0);
				break;
		}

		if (targetNodeId) {
			const targetNode = mapData.nodes.find((n) => n.id === targetNodeId);
			if (targetNode) {
				currentNodeId = targetNodeId;
				createOrUpdatePlayer(targetNode.position); // Move player instantly for now
			}
		}
	}

	// Helper to find a connected node in a general direction
	// Uses dot product to determine which connected node is most aligned with the direction
	function findConnectionInDirection(
		currentNode: LessonNodeData,
		dx: number,
		dy: number
	): string | undefined {
		let bestMatchId: string | undefined = undefined;
		let maxDotProduct = -Infinity; // Use dot product to find node most in the target direction

		const currentPos = new THREE.Vector2(currentNode.position.x, currentNode.position.y);
		const targetDir = new THREE.Vector2(dx, dy).normalize();

		currentNode.connections.forEach((connId) => {
			const connNode = mapData.nodes.find((n) => n.id === connId);
			if (connNode) {
				const connPos = new THREE.Vector2(connNode.position.x, connNode.position.y);
				const connDir = new THREE.Vector2().subVectors(connPos, currentPos).normalize();
				const dot = connDir.dot(targetDir);

				// Threshold dot product (e.g., > 0.5) to ensure it's generally in the right direction
				if (dot > 0.5 && dot > maxDotProduct) {
					maxDotProduct = dot;
					bestMatchId = connId;
				}
			}
		});
		return bestMatchId;
	}

	function handleCanvasClick(event: MouseEvent) {
		// --- Raycasting for Node Clicks (Mobile Tap) ---
		// This implements touch/click interaction for mobile devices
		const rect = canvasElement.getBoundingClientRect();
		const mouse = new THREE.Vector2();
		// Calculate mouse position in normalized device coordinates (-1 to +1)
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(mouse, camera);

		const intersects = raycaster.intersectObjects(Array.from(nodeMeshes.values()));

		if (intersects.length > 0) {
			const clickedNodeMesh = intersects[0].object as THREE.Mesh;
			const clickedNodeId = clickedNodeMesh.userData.id;

			// Check if the clicked node is connected to the current node
			const currentNodeData = mapData.nodes.find((n) => n.id === currentNodeId);
			if (currentNodeData && currentNodeData.connections.includes(clickedNodeId)) {
				const targetNode = mapData.nodes.find((n) => n.id === clickedNodeId);
				if (targetNode) {
					currentNodeId = clickedNodeId;
					createOrUpdatePlayer(targetNode.position);
				}
			}
		}
	}
</script>

<div class="canvas-container" bind:this={canvasContainer}>
	<canvas bind:this={canvasElement}></canvas>
</div>

<style>
	.canvas-container {
		display: block;
		width: 100%;
		height: 100%;
		overflow: hidden; /* Ensure no scrollbars */
		position: relative;
	}
	canvas {
		display: block; /* Prevent extra space below canvas */
		width: 100%;
		height: 100%; /* Fill the main container */
		touch-action: none; /* Prevent browser handling touch events */
	}
</style>
