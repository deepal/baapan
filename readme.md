# Baapan

![](https://github.com/dpjayasekara/baapan/raw/master/docs/logo.png)

**Baapan brings the all of the NPM goodness right into your REPL. On-demand!!.**

Using Node REPL for quick local testing is a common practice among JavaScript/Node developers. But the problem with the REPL is, you don't have the luxury to take advantage of the entire NPM ecosystem out-of-the-box. 

An alternative is, using something like RunKit. But fiddling with sensitive data in an online tool is not the best choice for many developers.

While using Node REPL, if you feel you need an NPM module to quickly test something (e.g, `lodash` to do some quick object/array manipulation, `uuid` to quickly generate some uuid), you'll have to manually install it via NPM and load it onto the REPL.

### Here's the cool part!!

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


**Feel free to drop any issues/feature requests/PRs at any time!!**

-----------------

<a href="http://cooltext.com" target="_top"><img src="https://cooltext.com/images/ct_button.gif" width="88" height="31" alt="Cool Text: Logo and Graphics Generator" /></a>