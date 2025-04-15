<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { GradeLevel } from '../../types';
	import { grades } from '../../config';

	const dispatch = createEventDispatcher<{ selectGrade: GradeLevel }>();

	// Determine the available grades (e.g., from 1 to 5 or based on config)
	// For simplicity, let's assume grades 1-5 are always potentially selectable
	// We'll use the imported 'grades' config to determine the mode for each.
	const availableGrades: GradeLevel[] = [1, 2, 3, 4, 5]; // Can adjust this based on requirements

	// Helper to get the mode for a grade
	function getModeForGrade(grade: GradeLevel): string {
		const config = grades.find((g) => g.grade === grade);
		// Capitalize for display
		return config ? config.mode.charAt(0).toUpperCase() + config.mode.slice(1) : 'N/A';
	}

	function handleSelectGrade(grade: GradeLevel) {
		dispatch('selectGrade', grade);
	}
</script>

<div class="grade-selection-container">
	<h1>Select Your Grade Level</h1>
	<div class="grade-buttons">
		{#each availableGrades as grade (grade)}
			{@const mode = getModeForGrade(grade)}
			<button
				class="grade-button"
				on:click={() => handleSelectGrade(grade)}
				disabled={mode === 'N/A'}
			>
				<span class="grade-number">Grade {grade}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.grade-selection-container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		background-color: #f0f4f8; /* Light background */
		padding: 40px;
		text-align: center;
		box-sizing: border-box;
	}

	h1 {
		color: #2c3e50; /* Dark blue-gray */
		margin-bottom: 30px;
		font-size: 2.5em;
	}

	.grade-buttons {
		display: flex;
		flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
		justify-content: center;
		gap: 20px; /* Spacing between buttons */
		margin-bottom: 30px;
	}

	.grade-button {
		padding: 60px 30px;
		border: none;
		border-radius: 8px;
		background-color: #3498db; /* Blue */
		color: white;
		font-size: 1.4em;
		cursor: pointer;
		transition:
			background-color 0.3s ease,
			transform 0.2s ease;
		min-width: 180px; /* Ensure buttons have a minimum size */
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
	}

	.grade-button:hover:not(:disabled) {
		background-color: #2980b9; /* Darker blue on hover */
		transform: translateY(-2px);
	}

	.grade-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.grade-button:disabled {
		background-color: #bdc3c7; /* Gray for disabled */
		cursor: not-allowed;
		opacity: 0.7;
	}

	.grade-number {
		font-weight: bold;
	}
</style>
