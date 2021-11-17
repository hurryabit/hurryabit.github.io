---
title: "Talk: Embedding DSLs deeper into GHC"
category: Link
tags: Daml Haskell PLDesign Talk
link: https://www.youtube.com/watch?v=mQulFrOp0Rg
---

This is a talk I gave at the [Zürich Friends of Haskell](https://zfoh.ch/)
meetup while I was working on the Haskell-based smart contract language
[Daml](https://daml.com/) at [Digital Asset](https://www.digitalasset.com/).

You can find the  slides on [Google Drive][slides] and the code in a
[GitHub Gist][code].

**Abstract.** Haskell is a great language for building EDSLs, partly due to its capabilities to overload various parts of its syntax. But, what if you want to go further? What if you want custom syntax? Or compile to a custom core language? For the DAML project we had exactly those requirements. In this talk we'll explain how we repurpose GHC to achieve them.

One of our main objectives is to reuse as much of GHC as possible with as few modifications as necessary. In particular, we do not want to touch the type checker since that is a complex and regularly changing part of the compiler. Consequently, changing any of GHC's ASTs is not an option. This desire heavily conflicts with the need to compile our custom syntax to corresponding constructs in our core language. This core language is basically System F plus primitives to define, create, query and archive smart contracts. The key idea to achieve this transportation without changing any of the ASTs is to desugar our custom syntax to standard Haskell constructs and recover them during the final conversion from GHC's core language to our custom core language.

[slides]: https://drive.google.com/file/d/1k0eSbz_Hs7325RdWb-PZlBVeJqyoqqB-/view
[code]: https://gist.github.com/hurryabit/24e787bfbe31c4e1cde9483a2debc93d
