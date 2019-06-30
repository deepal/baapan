# Baapan

![](https://github.com/dpjayasekara/baapan/raw/master/docs/logo.png)

**Baapan brings the all of the NPM goodness right into your REPL. On-demand!!.**

Using Node REPL for quick local testing is a common practice among JavaScript/Node developers. But the problem with the REPL is, you don't have the luxury to take advantage of the entire NPM ecosystem out-of-the-box. 

An alternative is, using something like RunKit. But fiddling with sensitive data in an online tool is not the best choice for many developers.

While using Node REPL, if you feel you need an NPM module to quickly test something (e.g, `lodash` to do some quick object/array manipulation, `uuid` to quickly generate some uuid), you'll have to manually install it via NPM and load it onto the REPL.

**Baapan** is a replacement for `require()` in node REPL. If the module you need is not installed locally, it will immediately grab it from NPM and load it to the console. Effortless! ✨😎!!

![](https://github.com/dpjayasekara/baapan/raw/master/docs/screenshot.png)

### How?

#### Step 1: Install baapan on your home directory

Simply run:

```sh
npm install -g baapan
```
This will install `baapan` CLI command.

#### Step 2: Load baapan with REPL

```sh
$ baapan
```

#### Step 3: Use `baapan` instead of `require`

```
Creating workspace...
Initializing workspace...
Workspace loaded!
> const lodash = baapan('lodash')
Baapan 'lodash' into the workspace!!
undefined
> lodash.concat([1], [2,3], 4)
[ 1, 2, 3, 4 ]
```

Baapan will immediately download the module via `npm` and `require` it immediately so that it's available on the REPL!!!!

**You can also `require` a submodule with `baapan()`. See the following:**

![](https://github.com/dpjayasekara/baapan/raw/master/docs/uuid.png)


**Feel free to drop any issues/feature requests/PRs at any time!!**

-----------------

<a href="http://cooltext.com" target="_top"><img src="https://cooltext.com/images/ct_button.gif" width="88" height="31" alt="Cool Text: Logo and Graphics Generator" /></a>