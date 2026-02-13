/**
 * Config plugin to increase Gradle JVM heap for EAS Build.
 * Fixes packageDebug/IncrementalSplitterRunnable OOM during APK packaging.
 */
const { withGradleProperties } = require('expo/config-plugins');

function withGradleMemory(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    const key = 'org.gradle.jvmargs';
    const value = '-Xmx4608m -XX:MaxMetaspaceSize=1024m';

    const idx = props.findIndex((p) => p.type === 'property' && p.key === key);
    if (idx >= 0) {
      props[idx].value = value;
    } else {
      props.push({ type: 'property', key, value });
    }

    config.modResults = props;
    return config;
  });
}

module.exports = withGradleMemory;
