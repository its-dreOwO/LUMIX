/**
 * Expo config plugin: injects extra lines into android/gradle.properties at prebuild time.
 *
 * Used to add:
 *   org.gradle.java.installations.auto-download=false
 *
 * This prevents Gradle from invoking the foojay toolchain resolver when compiling
 * Kotlin source for the lumix-llm native module. foojay-resolver-convention 0.5.0
 * (hardcoded by @react-native/gradle-plugin) crashes on Gradle 9 because it
 * references JvmVendorSpec.IBM_SEMERU which was removed in Gradle 9.
 * Disabling auto-download tells Gradle to use the already-installed JDK directly,
 * skipping the resolver entirely.
 */
const { withGradleProperties } = require('@expo/config-plugins');

const withDisableToolchainAutoDownload = (config) =>
  withGradleProperties(config, (props) => {
    const key = 'org.gradle.java.installations.auto-download';
    // Only add if not already present
    const exists = props.modResults.some(
      (item) => item.type === 'property' && item.key === key
    );
    if (!exists) {
      props.modResults.push({ type: 'property', key, value: 'false' });
    }
    return props;
  });

module.exports = withDisableToolchainAutoDownload;
