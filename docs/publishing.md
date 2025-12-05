# Package & Publish Lit View

1. Install dependencies and make sure the workspace builds cleanly.

   ```bash
   npm install
   npm run check
   ```

2. Compile the VS Code extension bundle (required before packaging).

   ```bash
   npm run compile
   ```

3. Package the `.vsix` without publishing (safe to run locally/on CI).

   ```bash
   npm run package
   ```

   The output `lit-view-<version>.vsix` lands in the repo root; verify it by installing in VS Code via “Extensions → … → Install from VSIX”.

4. When ready to publish, sign in with `vsce login <publisher>` and run:

   ```bash
   vsce publish
   ```

   Skip this step if you only need the `.vsix` artifact.

5. Update release notes (e.g., `overview.md` or CHANGELOG) to match the packaged version before distributing the VSIX or publishing to the marketplace.

> Tip: use `npm version patch|minor|major` to bump the extension version before packaging so marketplace uploads are accepted.
