/// <reference types="vite/client" />

// Permet à TypeScript de comprendre les imports de fichiers .vue
declare module '*.vue' {
	import type { DefineComponent } from 'vue'
	const component: DefineComponent<{}, {}, any>
	export default component
}

// Autoriser l'import de fichiers CSS dans TypeScript (utilisé pour les thèmes AG Grid)
declare module '*.css' {
	const css: string
	export default css
}

// (AG Grid retiré)
