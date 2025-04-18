<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { driver } from 'driver.js';
	import 'driver.js/dist/driver.css';

	import type { Driver, DriveStep } from 'driver.js';

	const dispatch = createEventDispatcher<{ nextStep: void; tutorialSkipped: void }>();

	// Input prop for the current tutorial step (1, 2, or 3)
	export const step: number = 1;

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
					driverObj.destroy();
				}
			}
		}
	];

	// Tutorial completed flag key
	const TUTORIAL_COMPLETED_KEY = 'equationArenaTutorialCompleted';

	// Initialize and start the tour
	function initTour() {
		driverObj = driver({
			showProgress: true,
			allowClose: true,
			onDestroyed: () => {
				console.log('Tutorial destroyed, setting flag.');
				try {
					localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
				} catch (e) {
					console.error('Failed to set localStorage item:', e);
				}
			},
			steps: tourSteps.map((stepConfig, index) => ({
				...stepConfig,
				popover: {
					...stepConfig.popover,
					doneBtnText: index === tourSteps.length - 1 ? 'Got it!' : undefined
				}
			}))
		});

		// Start the tour
		driverObj.drive();
	}

	onMount(() => {
		let tutorialCompleted = false;
		try {
			tutorialCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true';
		} catch (e) {
			console.error('Failed to read localStorage item:', e);
		}

		if (tutorialCompleted) {
			console.log('Equation Arena Crafter tutorial already completed, skipping.');
			dispatch('tutorialSkipped');
			return;
		}

		const timer = setTimeout(() => {
			initTour();
		}, 150);

		return () => clearTimeout(timer);
	});

	onDestroy(() => {
		if (driverObj) {
			driverObj.destroy();
		}
	});
</script>
