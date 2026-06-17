module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Encontrar la regla de source-map-loader y excluir date-fns
      const rules = webpackConfig.module.rules || [];
      
      // Buscar la regla del source-map-loader
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        
        // Verificar si es la regla del source-map-loader
        if (rule.enforce === 'pre' && rule.use && Array.isArray(rule.use)) {
          const hasSourceMapLoader = rule.use.some(
            (use) => use.loader && use.loader.includes('source-map-loader')
          );
          
          if (hasSourceMapLoader) {
            // Excluir date-fns del source-map-loader
            rule.exclude = [
              ...(Array.isArray(rule.exclude) ? rule.exclude : []),
              /node_modules\/date-fns/,
            ];
            break;
          }
        }
      }

      // Optimizaciones de bundle
      if (webpackConfig.mode === 'production') {
        // Optimizar code splitting
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              // Separar vendors en chunks más pequeños
              mui: {
                test: /[\\/]node_modules[\\/]@mui[\\/]/,
                name: 'mui',
                priority: 30,
                reuseExistingChunk: true,
              },
              firebase: {
                test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
                name: 'firebase',
                priority: 29,
                reuseExistingChunk: true,
              },
              reactQuery: {
                test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query[\\/]/,
                name: 'react-query',
                priority: 28,
                reuseExistingChunk: true,
              },
              charts: {
                test: /[\\/]node_modules[\\/](recharts|d3-)[\\/]/,
                name: 'charts',
                priority: 27,
                reuseExistingChunk: true,
              },
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendor',
                priority: 10,
                reuseExistingChunk: true,
              },
            },
          },
          // Minimizar re-renders
          runtimeChunk: 'single',
        };
      }
      
      return webpackConfig;
    },
  },
};

