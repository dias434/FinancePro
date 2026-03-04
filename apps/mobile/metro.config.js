const path = require("path")
const { getDefaultConfig } = require("expo/metro-config")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "../..")

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
]
// With pnpm, many dependencies are nested under the package that requires them.
// Hierarchical lookup must stay enabled so Metro can resolve those transitive deps.
config.resolver.disableHierarchicalLookup = false
config.resolver.unstable_enableSymlinks = true

module.exports = config
