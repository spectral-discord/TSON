import dts from 'rollup-plugin-dts'

export default [
  {
    input: 'lib/main.js',
    output: {
      file: 'dist/bundle.cjs.js',
      format: 'cjs'
    }
  },
  {
    input: 'lib/main.js',
    output: {
      file: 'dist/bundle.es.js',
      format: 'es'
    }
  },
  {
    input: 'lib/main.d.ts',
    plugins: [dts()],
    output: {
      file: 'dist/bundle.d.ts',
      format: 'es',
    },
  }
]