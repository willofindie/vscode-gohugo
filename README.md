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
![Create new content](https://user-images.githubusercontent.com/11786283/113461429-2bdf4a80-943a-11eb-81b0-f82b9528fd95.gif)


## Issues

- Current version works only with `.toml` configurations.
  - Will fix this in later releases.

