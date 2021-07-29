# GoHugo (A VSCode Extension)

<div align="center">
  <img
  src="https://user-images.githubusercontent.com/11786283/113192452-669b8400-927c-11eb-8510-69def7bcb6d3.png"
  height="150"
  alt="GoHugo Extension Icon" />
</div>

Command Line helper in VSCode for Hugo Static Site generator.

## VSCode Configs (settings.json):

- `gohugo.config`: `string`
  - Relative path to your Hugo Config TOML file
  - Default: `config.toml`
- `gohugo.port`: `number`
  - Hugo Development server PORT
  - Default: `3000`
- `gohugo.showTerminal`: `boolean`
  - Show Terminal on Hugo Server Start. Enable it to show the terminal
    where Hugo Server is running. If false, terminal is hidden, and can
    be manually opened by the user, if needed.
  - Default: `false`

## Features

Provides following VSCode Commands

- Get Version
  - To get `hugo` command version
- Create New Site
  - Creates a new hugo project, and changes
    workspace
- Add Theme or Select Theme
  - Add Theme, from custom URL
  - Select themes from Hugo's official list.
- Create New Content
  - Creates a new Post, or any Content.
  - Supports Archetypes completely, i.e.
    - Templates defined under archetypes will be considered, while creating new content
    - Folder Templates defined as archetypes will be used to
      spit out folder content, with [--kind](https://gohugo.io/content-management/archetypes/#directory-based-archetypes) option.
- Start/Stop Debug Server
- Build
  - Generate Prod Build

Currently this project supports only `.toml`
configurations.

## Screenshots

> To open VSCode Command Palette, click
> - Windows/Linux: `CTRL + SHIFT + P`
> - MacOS: `CMD + SHIFT + P`

### How to Install
![How to Install](https://user-images.githubusercontent.com/11786283/113466924-28a98600-945d-11eb-903f-1a71160b3476.gif)


### Create New Content

__Create new content without Archetypes__
![Create new content without Archetypes](https://user-images.githubusercontent.com/11786283/127490969-e607b956-df68-4295-9b38-f6c70d51c4d1.gif)

__Create new content with Archetypes__
![Create new content with Archetypes](https://user-images.githubusercontent.com/11786283/127491034-75828593-795e-4cd3-a16a-75b391a1967f.gif)

#### NOTE:
Create new content is a special command which supports Archetypes as well as plain default templates.
User should keep a note of the following 3 things that can happen if using this command:

- Without Archetypes:
  - When there is no archetype templates, user is free to pass any string path, which can
    contain filenames or filenames within a subdirectory e.g:
    - `default` will create a `default.md` file in `contentDir`
    - `posts/default.txt` will a create a subdirectory `posts` inside `contentDir`, with a file `default.txt` in it.
- With Archetype:
  - User can still use Default template with option `[Default]`
  - User can chose a Archetype Template Directory and input a path where proper files will be created
  - User can chose a Archetype Template File and input a path with filename.
    - If a Subdirectory is present in the path, new generated file will be created inside that subdirectory.
    - If not Subdirectory is not present, file will be generated in `contentDir/`.

## Issues

- Current version works only with `.toml` configurations.
  - Will fix this in later releases.

