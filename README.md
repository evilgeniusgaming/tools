# Everyday Heroes Command Line Tool

Command line tool for developer operations for the Everyday Heroes system and modules.

## Build Command

```shell-script
# Compile all CSS, javascript, and compendium packs for release
ehcli build
```

## Compile Command

```shell-script
# Compile all CSS files in a package
ehcli compile css

# Compile all javascript files in a package
ehcli compile javascript
```

## Package Command

```shell-script
# Pack JSON files into a Classic Level database
ehcli package pack
# Unpack Classic Level database into separate JSON files
ehcli package unpack

# Pack JSON files into a NeDB database
ehcli package pack --nedb
# Unpack NeDB database into separate JSON files
ehcli package unpack --nedb

# Pack only a single compendium pack
ehcli package pack --pack hero-options
```
