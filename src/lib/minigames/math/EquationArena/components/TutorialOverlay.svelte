<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { driver } from 'driver.js';
	import 'driver.js/dist/driver.css';

	import type { Driver, DriveStep } from 'driver.js';

	const dispatch = createEventDispatcher<{ nextStep: void }>();

	// Input prop for the current tutorial step (1, 2, or 3)
	export let step: number = 1;

	let driverObj: Driver;

	const tourSteps: DriveStep[] = [
		{
			element: '.numpad-area',
			popover: {
				title: 'Step 1',
				description: 'Tap numbers and operations to build an equation.',
				side: 'top' as const,
				align: 'center',
				onNextClick: () => {
					dispatch('nextStep');
					driverObj.moveNext();
				}
			}
		},
		{
			element: '.paren-buttons',
			popover: {
				title: 'Step 2',
				description: 'Use parentheses () to control the order of operations for bonus power!',
				side: 'top' as const,
				align: 'start',
				onNextClick: () => {
					dispatch('nextStep');
					driverObj.moveNext();
				}
			}
		},
		{
			element: '#equation-display',
			popover: {
				title: 'Step 3',
				description:
					'Create equations demonstrating mathematical properties (like Commutative: 2+3 = 3+2) for extra power!',
				side: 'bottom' as const,
				align: 'center',
				onNextClick: () => {
					dispatch('nextStep');
					driverObj.moveNext();
				}
			}
		}
	];

	// Initialize and start the tour
	function initTour() {
		driverObj = driver({
			showProgress: true,
			nextBtnText: step === 3 ? 'Got it!' : 'Next',
			steps: tourSteps
		});

		// Start the tour
		driverObj.drive();
	}

	onMount(() => {
		initTour();
	});

	onDestroy(() => {
		if (driverObj) {
			driverObj.destroy();
		}
	});
</script>

<!-- This component doesn't need a template anymore as driver.js creates its own UI -->

<style>
	@keyframes pop-in {
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
