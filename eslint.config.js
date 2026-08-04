import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['dist', 'coverage'] },
	eslint.configs.recommended,
	tseslint.configs.strict,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
		},
		rules: {
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
		},
	},
	{
		files: ['scripts/**/*.mjs'],
		languageOptions: {
			globals: { console: 'readonly', URL: 'readonly' },
		},
	},
);
