# Team Squirtle

As part of the impact.com platform (see https://impact.com/) we often connect 3 parties together, who do not necessarily know each other and have no formal relationship, but need to do trusted business with each other.  a) An entity paying for goods (e.g. manufacturer or brand) needs to be certain that only specific goods can be bought by the person receiving the goods. They must be able to guarantee that their money is being spent as intended.  b) An entity providing the goods (e.g. an advertiser) needs to be certain that they will get paid for the goods.  c) An entity receiving goods (e.g. end-user or social influencer) needs to be certain they will receive the goods.  The proposed project will use blockchain (as a public ledger/system of record) to create crypto vouchers that can be issued automatically to provide a 3-way contract between these parties. The project will involve researching blockchain (and crypto technologies) and providing a platform to request, supply, and verify vouchers. The blockchain also provides a ledger that can be inspected and queried, even for historical contracts.

## Project Setup

The following will help you setup your local environment for development. Starting with gitflow. For instructions on how to setup Gideon [Back End] and Viper [Front End] check the READMEs in their respective folders.

### Gitflow Setup

First clone the repository.

```sh
git clone git@git.cs.sun.ac.za:Computer-Science/rw344/2024/Squirtle-cs344.git
```

Then path into it and you need to initialise git flow. Select master for production branch and develop for next release, leave everything else the default.

```sh
git flow init
```

After you have done that you are ready to use git flow.

### Gitflow Features

The following will guide you through working with features in gitflow. Features are for adding new parts of code for a new release, they are made off the develop branch.

#### 1. Starting a Feature

Development of new features starting from the 'develop' branch.

```sh
git flow feature start my-feature
```

#### 2. Finishing a Feature

After you have worked on the feature branch and have clompleted the feature after several commits, finish the feature by doing the following.

```sh
git flow feature finish my-feature
```

#### 3. Publishing a Feature

If you need to work with others on the feature then publish it by doing the following.

```sh
git flow feature publish my-feature
```

#### 4. Pulling a Feature

If you want to work on a feature that someone else have created then pull the feature by doing the following.

```sh
git flow feature pull origin my-feature
```

### Gitflow Hotfixes

The following will guide you through how to use hotfixes. hotfixes are used for quick fixes to code in the master branch. This should be rare for us to use.

#### 1. Starting a Hotfix

Development of new hotfixes starting from the 'master' branch.

```sh
git flow hotfix start VERSION
```

#### 2. Finishing a Hotfix

After you have worked on the hotfix branch and have clompleted the hotfix after several commits, finish the hotfix by doing the following.

```sh
git flow hotfix finish VERSION
```

### Gitflow Releases

The following will guide you through how to use releases. Releases are for making final changes before merging to the master branch.

#### 1. Starting a Release

Development of new releases starting from the 'develop' branch.

```sh
git flow release start RELEASE [BASE]
```

Specify `[BASE]` if you want to start the release at a specific commit hash. This is optional.

#### 2. Publishing a Release

It is wise for everyone to look at the release first before finishing it. Publish it by doing the following.

```sh
git flow release publish RELEASE
```

#### 3. Finishing a Release

After you have worked on the release branch and have clompleted it, finish the release by doing the following.

```sh
git flow release finish RELEASE
```