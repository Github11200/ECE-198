<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
	import { toggleMode } from 'mode-watcher';
	import { Button } from '#lib/components/ui/button/index.js';
</script>

<Button
	variant="ghost"
	size="icon"
	class="text-muted-foreground hover:text-foreground"
	onclick={toggleMode}
	aria-label="Toggle colour theme"
	title="Toggle colour theme"
>
	<span class="dark:hidden"><HugeiconsIcon icon={Moon02Icon} size={18} strokeWidth={1.8} /></span>
	<span class="hidden dark:inline"
		><HugeiconsIcon icon={Sun03Icon} size={18} strokeWidth={1.8} /></span
	>
</Button>
