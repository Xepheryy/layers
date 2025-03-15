# Introduction
Layers is a project that enables developers to inspect their container layers depending on the provided build file by emulating the layers using docker commands like docker inspect, docker extract etc,

Intern learning about containerizationn or just a skill issue? Use layers gain deep insight into your containers at every layer

# Design style
Modern, minimal, clean.

3 column, left sidebar, middle main content, right text editor.

Start with a light mode to cater to most users.



# Prerequisites
- Check for docker, docker-compose commands, without sudo 

# Features
- Diff docker layers between current and next
- View files in the selected layer
- View potential impacts of changing dockerfile on the fly
- Includes a text editor that has syntax highlighting and tooltips for each dockerfile command
- Store extracted layers in a rolling cache so we don't exceed storage (configurable)

