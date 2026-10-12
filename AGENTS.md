# Architecture rules

- Scope the /app messenger theme through `.web-chat-theme` and semantic chat tokens; this keeps topic Chat and Nutrition consistent without recoloring unrelated pages.
- Render photo Home through the dedicated web-only `WebHomeView` and scope styles through `.web-home-theme`; this keeps Telegram and other web sections unchanged.
- Store Home tile imagery as separate imported images mapped by section; this keeps each subject correctly framed without coupling tile layout to a sprite grid.