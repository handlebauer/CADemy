import { Pane, type FolderApi } from 'tweakpane';

// Define the structure for defining a single Tweakpane binding
export interface TweakpaneBindingParams {
	target: Record<string, unknown>; // Use unknown instead of any
	key: string; // The key of the value in the target object (must match the key in target)
	options?: Record<string, unknown>; // Use unknown instead of any
	folderTitle?: string; // Optional: Title of the folder to group this binding into
	onChange?: (value: unknown) => void; // Use unknown instead of any
}

/**
 * Sets up a Tweakpane instance with the given bindings.
 * @param container - The HTML element to append the pane to. If undefined, uses default.
 * @param bindings - An array of binding configurations.
 * @param paneTitle - Optional title for the Tweakpane panel.
 * @returns The created Tweakpane Pane instance.
 */
export function setupTweakpane(
	container: HTMLElement | undefined,
	bindings: TweakpaneBindingParams[],
	paneTitle: string = 'Config'
): Pane {
	const pane = new Pane({
		title: paneTitle,
		container: container
	});

	const folders: Record<string, FolderApi> = {}; // Use FolderApi type

	bindings.forEach((binding) => {
		let targetFolder: Pane | FolderApi = pane; // Type can be Pane or FolderApi

		// Check if a folder is specified
		if (binding.folderTitle) {
			if (!folders[binding.folderTitle]) {
				// Create folder if it doesn't exist
				folders[binding.folderTitle] = pane.addFolder({ title: binding.folderTitle });
			}
			targetFolder = folders[binding.folderTitle];
		}

		// Add the binding to the pane or folder
		const bindingApi = targetFolder.addBinding(binding.target, binding.key, binding.options || {});

		// Attach the onChange handler if provided
		if (binding.onChange) {
			bindingApi.on('change', (ev) => {
				if (binding.onChange) {
					binding.onChange(ev.value);
				}
			});
		}
	});

	return pane;
}
