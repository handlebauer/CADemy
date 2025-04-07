<script lang="ts">
	// External imports
	import { onMount } from 'svelte';

	// Component imports
	import MapCanvas from '$lib/components/MapCanvas.svelte';

	// Type & constant imports
	import type { SubjectMapData } from '$lib/types/map';
	import type { Subject } from '$lib/types/subjects';
	import { SUBJECTS } from '$lib/types/subjects';

	// Utility imports
	import { getMapData } from '$lib/mapData';

	let selectedSubject: Subject = SUBJECTS[0]; // Default to first subject
	let currentMapData: SubjectMapData | undefined;

	// Reactive statement: $: ensures this runs whenever selectedSubject changes
	$: currentMapData = getMapData(selectedSubject);

	function selectSubject(subject: Subject) {
		selectedSubject = subject;
	}

	// Example interaction display
	let currentNodeInfo: string | null = null;

	function handleNodeInteraction(nodeName: string) {
		currentNodeInfo = `Interacting with: ${nodeName}`;
		// Hide info after a delay
		setTimeout(() => (currentNodeInfo = null), 3000);
	}
</script>

<div class="app-container">
	<header>
		<h1>Incept Layer 2 - Overworld</h1>
		<nav class="subject-tabs">
			{#each SUBJECTS as subject}
				<button on:click={() => selectSubject(subject)} class:active={selectedSubject === subject}>
					{subject}
				</button>
			{/each}
		</nav>
	</header>

	<main>
		{#if currentMapData}
			<MapCanvas mapData={currentMapData} onNodeInteract={handleNodeInteraction} />
		{:else}
			<p>Select a subject to view the map.</p>
		{/if}

		{#if currentNodeInfo}
			<div class="node-info-popup">
				{currentNodeInfo}
			</div>
		{/if}
	</main>
</div>

<style>
	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
		overflow: hidden; /* Prevent scrollbars from layout */
	}
	header {
		padding: 0.5rem 1rem;
		background-color: #eee;
		border-bottom: 1px solid #ccc;
	}
	.subject-tabs button {
		padding: 0.5rem 1rem;
		margin-right: 0.5rem;
		border: 1px solid #ccc;
		background-color: #fff;
		cursor: pointer;
	}
	.subject-tabs button.active {
		background-color: #ddd;
		border-bottom-color: #ddd;
	}
	main {
		flex-grow: 1; /* Canvas takes remaining space */
		position: relative; /* For positioning popups */
		background-color: #f8f8f8; /* Default background */
	}
	.node-info-popup {
		position: absolute;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		background-color: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 10px 20px;
		border-radius: 5px;
		z-index: 10;
	}
</style>