export default [
  {
    input: 'src/main.js',
    output: {
      file: 'bundle.js',
      format: 'cjs'
    }
  },
  {
    input: `src/main.js`,
    plugins: [dts()],
    output: {
      file: `dist/bundle.d.ts`,
      format: 'es',
    },
  }
]