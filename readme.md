# Baapan

![](https://github.com/dpjayasekara/baapan/raw/master/docs/logo.png)

**Baapan brings the all of the NPM goodness right into your REPL. On-the-fly!!.**

Using Node REPL for quick local testing is a common practice among JavaScript/Node developers. But the problem with the REPL is, you don't have the luxury to take advantage of the entire NPM ecosystem out-of-the-box. 

An alternative is, using something like RunKit. But fiddling with sensitive data in an online tool is not the best choice for many developers.

While using Node REPL, if you feel you need an NPM module to quickly test something (e.g, `lodash` to do some quick object/array manipulation, `uuid` to quickly generate some uuid), you'll have to manually install it via NPM and load it onto the REPL. Here's how `baapan` makes it easy!!!

### Baapan - the life saver

Baapan intercepts `require()` calls and automatically install the module if the module is not locally available. You can `require()` whatever you want, and Baapan will `require()` it for you? Don't you think it's cool??

![](https://github.com/dpjayasekara/baapan/raw/master/docs/baapan.gif)

### Getting Started

#### Step 1: Install baapan globally

Simply run:

```sh
npm install -g baapan
```
This will install `baapan` CLI command.

#### Step 2: Load Baapan

You can launch Baapan by just running `baapan` command on terminal after installation. `baapan` will launch the NodeJS REPL for you.

```sh
$ baapan
```

#### That's it. You can now require() everything you want!!

This time I need to generate a random IP address. I can require `chance` to do that.

```
Creating workspace...
Initializing workspace...
Workspace loaded!
> const chance = require('chance').Chance()
undefined
> chance.ip()
'213.15.210.129'
```
### Baapan Workspace

Every instance of `baapan` REPL server has its own workspace independent of each other. All module installations are done within the boundary of the workspace. This helps you open multiple `baapan` REPLs at once, install different modules without any conflicts. Current workspace for the REPL is automatically cleaned-up when you _gracefully_ exit the REPL shell (e.g, pressing `ctrl+c` twice or `.exit` command). 

> **Note!** If the REPL process was killed forcefully, the workspace directory will not be cleaned up automatically. You have to clean up these stale workspace directories manually.

Workspaces are by-default created in `$HOME/.baapan/` directory. You can see the workspace directory for your REPL session by reading the `BAAPAN_WS_PATH` environment variable.

e.g,

```
> process.env.BAAPAN_WS_PATH
'/Users/djayasekara/.baapan/workspace_44023_1562678000424'
``` 

#### Persist Workspace And Modules
Baapan will not create a fresh workspace upon startup if the user has explicitly provided one using the `BAAPAN_WS_PATH` environment variable. 

If it was provided explicitly, baapan will not clean up the workspace when the session is closed and you can persist the workspace and modules you install.

You can explicitly provide `BAAPAN_WS_PATH` as follows:

e.g.

#### Windows

```
$ set process.env.BAAPAN_WS_PATH=D:\nodejs\baapan-modules-repo
$ baapan
Creating workspace...
Workspace loaded!
> process.env.BAAPAN_WS_PATH
'D:\\nodejs\\baapan-modules-repo'
```

#### Unix

```
$ BAAPAN_WS_PATH=/Users/johndoe/baapan-modules-repo baapan
Creating workspace...
Workspace loaded!
> process.env.BAAPAN_WS_PATH
'/Users/johndoe/baapan-modules-repo'
```

**Feel free to drop any issues/feature requests/PRs at any time!!**

-----------------

`baapan` i.e, "බාපං" in [Sinhala language](https://en.wikipedia.org/wiki/Sinhala_language) is the translation for fetch/download 🇱🇰

<a href="http://cooltext.com" target="_top"><img src="https://cooltext.com/images/ct_button.gif" width="88" height="31" alt="Cool Text: Logo and Graphics Generator" /></a>