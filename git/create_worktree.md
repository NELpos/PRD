# Prompt to create a worktree

Your task is to create a new worktree named 'feature_a' in the .trees/feature_a folder.

Follow these steps:

1. Check if an existing folder in the .trees folder with the name feature_a already exists. If it does, stop here and tell the user the worktree already exists.
2. Create a new git worktree in the .trees folder with the name feature_a.
3. Symlink the .venv folder into the worktree directory
4. Launches a new VSCode editor instance in that directory by running the 'code' command
