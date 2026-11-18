<script lang="ts">
	import Scenery from './scenery.svelte';

	type Props = {
		preset?: 'hero' | 'section' | 'dashboard';
		class?: string;
	};

	let { preset = 'hero', class: className = '' }: Props = $props();
</script>

<Scenery {preset} class={className} />
