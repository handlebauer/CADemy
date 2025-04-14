<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	const dispatch = createEventDispatcher<{ nextStep: void }>();

	// Input prop for the current tutorial step (1, 2, or 3)
	export let step: number = 1;

	let dialogElement: HTMLDivElement;

	// Tutorial text based on the step
	$: tutorialText = (() => {
		switch (step) {
			case 1:
				return 'Tap numbers and operations to build an equation.';
			case 2:
				return 'Use parentheses () to control the order of operations for bonus power!';
			case 3:
				return 'Create equations demonstrating mathematical properties (like Commutative: 2+3 = 3+2) for extra power!';
			default:
				return 'Something went wrong with the tutorial.';
		}
	})();

	function handleNext() {
		dispatch('nextStep');
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleNext();
		}
	}

	// Focus the dialog when it mounts
	onMount(() => {
		dialogElement?.focus();
	});
</script>

<div
	class="tutorial-overlay"
	on:click|self={handleNext}
	on:keydown={handleKeyDown}
	aria-modal="true"
	role="dialog"
	tabindex="-1"
	bind:this={dialogElement}
>
	<div class="tutorial-box animate-pop-in">
		<h2>Step {step}</h2>
		<p>{tutorialText}</p>
		<button class="next-button" on:click={handleNext}>
			{step === 3 ? 'Got it!' : 'Next'}
		</button>
	</div>
	<!-- TODO: Add highlighting logic based on targetElementSelector if needed -->
</div>

<style>
	.tutorial-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.6); /* Semi-transparent background */
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 2000; /* Ensure it's on top of everything */
		backdrop-filter: blur(3px);
	}

	.tutorial-box {
		background-color: #ffffff;
		padding: 30px 40px;
		border-radius: 12px;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
		text-align: center;
		max-width: 450px;
		width: 80%;
		color: #333;
	}

	h2 {
		color: #3498db;
		margin-top: 0;
		margin-bottom: 15px;
		font-size: 1.8em;
	}

	p {
		font-size: 1.1em;
		line-height: 1.6;
		margin-bottom: 25px;
		color: #555;
	}

	.next-button {
		padding: 12px 30px;
		font-size: 1.1em;
		font-weight: bold;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		background-color: #2ecc71; /* Green button */
		color: #fff;
		transition: background-color 0.2s ease;
	}

	.next-button:hover {
		background-color: #27ae60;
	}

	/* Animation for the box */
	.animate-pop-in {
		animation: pop-in 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
		opacity: 0;
		transform: scale(0.7);
	}

	@keyframes pop-in {
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
