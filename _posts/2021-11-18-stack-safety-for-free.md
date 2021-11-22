---
title: "Stack-safety for free?"
description: "I demonstrate how to (ab)use generators to transform any recursive function into an iterative one with nearly zero code changes."
header:
    teaser: /assets/images/binomial-stack-safe.png
category: Blog
tags: Rust Python JavaScript PLDesign
# classes: wide
related: false
---

<script>
GIST_CUTS = [
    /^fn triangular\b/,
    /^fn triangular_safe/,
    /^fn trampoline/,
];
</script>


**tl;dr.** I demonstrate how to (ab)use generators/coroutines to transform any recursive function into an iterative function with nearly zero code changes. I explain the technique using a small example written in Rust, which can also be found on the [Rust Playground][playground_rs] and in a [GitHub Gist][gist_rs]. You can find links to implementations of the same example in Python and JavaScript in the [Links](#links) section at the end.

If you are in a rush, you could skip the introduction and immediately jump to the [implementation](#implementation).


# Introduction

During my recent preparation for coding interviews, I came across a problem where part of the solution was to determine all strongly connected components of a directed graph. I decided to compute these components using [Tarjan's algorithm][tarjans_algorithm], which is basically a glorified depth-first search through the graph. Unfortunately for me, the test inputs on the coding platform I used were so large that my _recursive_ implementation caused a stack overflow. Since I had no control over the execution environment, simply increasing the stack limits was not an option.[^stack_overflow] Thus, I started to re-implement the depth-first search in an iterative fashion.

The general approach for transforming recursion into iteration is to simulate the call stack in the heap and properly manipulate this simulated stack in one big loop until the stack is empty. The actual loop body can be derived from the original recursive implementation in a very systematic way that can also be very tedious. While I was semi-systematically struggling through this tedium, I got annoyed by the fact that I as a human was doing something a computer would be so much better at than me. I stepped away from the problem and a few instants later it just struck me: What I was trying to do by hand is pretty much exactly the same a compiler has to do when desugaring [generators][generators] (or [coroutines][coroutines]) into simpler language constructs.

At this moment, my problem turned from a quite annoying one into a really exciting one: Can I actually (ab)use the compiler's capabilities regarding generators to serve my goal of transforming recursion into iteration? I quickly fired up my Python IDE, read through the [docs for generators][generators_docs_py], and hacked a little bit.[^hacking_python] A couple of minutes later, I had a small prototype demonstrating my idea works in principle. I was pretty hyped!

Since then, I've played with the idea a lot. I got more complex and bigger examples to work, tried it out in other programming languages, thought about mutually recursive functions, looked into mutability and ownership, ran a lot of benchmarks, and figured out how to handle tail calls efficiently. I also started to wonder if this idea is actually well-known and I'm just reinventing the wheel or if I'm onto something. Despite my best efforts, I could not find any evidence of this idea anywhere. That's why we're here now! Although there's a lot to write about, this blog post focuses solely on the basic idea. I'll talk about everything else in future blog posts.


# Implementation

The basic idea behind the technique to transform recursion into iteration is surprisingly simple and can be implemented in any language that supports generators. I've chosen to use Rust here since convincing its very rigid type and borrow checkers of my idea increases me confidence that the idea is sound. In fact, we need to use [Rust nightly][rust_nightly] because generators are not stable yet.

We use a small recursive function `triangular`, which computes [triangular numbers][triangular_numbers], as an example to demonstrate the technique. Note that `triangular` is _not_ tail recursive. Although this is surely not the sort of function where one would resort to general techniques, its simplicity allows us to focus on the transformation itself rather than being distracted by unrelated complexity. An uninterrupted and self-contained version of the code shown in this blog post can be found on the [Rust Playground][playground_rs] in a [GitHub Gist][gist_rs].

{% gist hurryabit/972be7d92fa7359ebb068b29d9e95a3b %}

In order to transform `triangular` into an iterative function, we only need to perform two simple steps:

1. Replace every recursive call to `triangular` by a `yield` expression.
1. Wrap the resulting _generator function_ into the higher-order function `trampoline`, which we will discuss below.

The result of this transformation is the function `triangular_safe` below, which computes the same values as `triangular` but does so without overflowing the stack, even for large input values `n`. In other words, `triangular_safe` is a stack-safe version of `triangular`.

{% gist hurryabit/972be7d92fa7359ebb068b29d9e95a3b %}

Despite some minor boilerplate introduced by Rust's syntax for generators, namely the `move |_|` bit, it should be quite clear how we got from `triangular` to `triangular_safe`. Ultimately, this transformation could be implemented by a [procedural attribute macro][proc_attr_macro] in Rust.

The final piece of the technique is the higher-order function `trampoline`.[^trampoline] It is important to understand that `trampoline` cannot only handle `triangular` but rather all recursive functions of some type `fn(A) -> B`, where `A` doesn't contain any mutable references, regardless of whether they are tail recursive or not. Roughly speaking, `trampoline` implements the general approach of "simulate the call stack in the heap and run one big loop" mentioned above. The elements of this simulated stack are partially run generators that have been produced by a generator function `f` passed to `trampoline`. In our example, `f` is the generator function we've obtained from `triangular` by replacing each recursive call with `yield`. One can think of this construction as `f` "returning" to the loop instead of calling itself recursively and the loop orchestrating the proper flow of calls to `f`.

{% gist hurryabit/972be7d92fa7359ebb068b29d9e95a3b %}


# Conclusion

The presentation of a technique that general often raises more questions than it answers. A few question that come mind immediately: Does it work in all cases, like in the presence of mutable references? In which directions can it be further generalized, to mutually recursive functions for example? And what about performance? Although I know that it can be made to work with mutable references and have an idea for how to make it work with mutual recursion, I won't go into any details here but rather do so in future blog posts.

Regarding performance, I have some preliminary numbers which make me quite optimistic. The iterative version of Tarjan's algorithm produced using this technique seems to be less than 5% slower than the recursive version. For the [Ackermann function][ackermann_function], which does barely anything besides making recursive calls, the slowdown is under 25%. To get the full picture we need a lot more benchmarks and performance tunings though.

If it turns out that the range of recursive functions to which this technique can be applied with acceptable performance implications is big enough, I intend to make an implementation of this idea easily available to everybody on [crates.io][crates_io]. My grand vision in this direction is to provide an attribute macro `#[stack_safe]` that can be slapped onto any recursive function to automatically transform it into an iterative function.

If all stars align and we achieve acceptable performance, manage to implement such a macro and land generators in Rust stable, we will be able to boldly claim Rust provides **"Stack-safety for free!"**


# Links

* [GitHub repository][github_repo] containing my experiments with the idea
* [Reddit post][reddit_post] with some interesting comments

The following links provide uninterrupted and self-contained versions of the code shown in this blog post and translations into other languages.

* [Rust Playground][playground_rs]
* [Python Playground][playground_py]
* [JavaScript Playground][playground_js]
* [GitHub Gist with Rust code][gist_rs]
* [GitHub Gist with Python code][gist_py]
* [GitHub Gist with JavaScript code][gist_js]


[^stack_overflow]: While I worked on the smart contract language [Daml][daml] at [Digital Asset][digital_asset], we had to deal with so many stack overflows caused by recursive traversals of deep abstract syntax trees in execution environments we had no control over that it has become almost second nature to me to blame the recursion and not the stack limits for the overflows.
[^hacking_python]: Although I generally prefer strongly typed programming languages, I didn't want any type checker to get in my way while exploring this question.
[^trampoline]: In the initial version of this blog post, `trampoline` was called `recurse`. As [anydalch pointed out on Reddit][reddit_trampoline] such a function is known as a [trampoline][wiki_trampoline] in programming. Hence the change in name.


[tarjans_algorithm]: https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
[generators]: https://en.wikipedia.org/wiki/Generator_(computer_programming)
[coroutines]: https://en.wikipedia.org/wiki/Coroutine
[generators_docs_py]: https://docs.python.org/3/reference/expressions.html?highlight=send#yield-expressions
[rust_nightly]: https://rust-lang.github.io/rustup/concepts/channels.html
[triangular_numbers]: https://en.wikipedia.org/wiki/Triangular_number
[proc_attr_macro]: https://doc.rust-lang.org/reference/procedural-macros.html#attribute-macros
[ackermann_function]: https://en.wikipedia.org/wiki/Ackermann_function
[crates_io]: https://crates.io
[daml]: https://daml.com
[digital_asset]: https://www.digitalasset.com
[reddit_post]: https://www.reddit.com/r/rust/comments/qwr270/stacksafety_for_free/
[reddit_trampoline]: https://www.reddit.com/r/rust/comments/qwr270/comment/hl5lihl/?utm_source=share&utm_medium=web2x&context=3
[wiki_trampoline]: https://en.wikipedia.org/wiki/Trampoline_%28computing%29
[github_repo]: https://github.com/hurryabit/stack-safe-rs
[playground_rs]: https://play.rust-lang.org/?version=nightly&mode=debug&edition=2021&gist=6d0677b262443a8e0f1b1d7fd193434f
[playground_py]: https://www.online-python.com/KXmLvup8J6
[playground_js]: https://www.typescriptlang.org/play?strict=false&noImplicitAny=false&strictNullChecks=false#code/PTAEBUAsEsGdQA4BsCGBPA5gJwPYFcA7AE1AGMcCAXFaA+SyAU1ACkUA3FAZVK2gUqh2jLLGgVQOAGagGzckWZTcAW1lNQAIyQ4MiHLEoAoEKEiVKCWAC4QkPFixoUm6JQB0GN-c3vxwbV1gQxRSAGsAWlgUKUZKNAipHCxErEZGYCMpQlJKcQJZPhQCDDxULAAKAgBKUABvI1Am0GgZKtAAXg7QAAZahubB0DTKBwKegG5G5oBfUEYkWGYBoaaRsdACgGpC6GLS8vaI0ABGaqnBmaMrrJy8iUosFBUEHCRaRgqpfumm7IJcvlQCo8AB9KQVFBYDA-VZNch0QQhcKdUAAbQAuhc4Ug4mQHGkqKiIVCYdjVrjBGl4N1CIopB8iFNfkMAO4wXGgCqPPCMWFwwYIwz1UBECiMAA0QhQSF5oDm3VIBMYVHcBEYAA9KBVqecWQLWlyAIRi9X8gWrZFhdwIPCwSAVJWOFWUPUWuFOwmCboQziyvnk93NamoumMBnqpn6uFzBZLerR92GipW9y4koMUAAPl65qDq09LtRqdeCAqbvzcJD3T9vMD+dji2Wicr6ywBVrjHrQauDZbvdmRhZbYKIPBUxuQsEjz2JTKUNB0ViqMez1e73VXzu+QAVFyagnBsmCl1c4eq3ENpMWY34ytViPNqAdhU0NAFiQjqdqhWmlcZnqRhTqAAAyACCABKADiACiqInD0PSgoh15Cm8jDuKQuJQuWzLJjO+zzlgi4xJ84HQTBtRGt05GwaAe4VLRcE7GcoBgAATHmDC4KyoAwY4yQVAARAABgRc7lCRsQiWQOAvHglCMCQrK4CU0r+u4Ql6lcaG4mmujCWJRQSQuS6MDJkAoPABA4IIODCFgUg6KySktJQ8CplpzK6RhOgYIZ4kHFCMmstASBIJIDlOTgvFuB51AorAOAUO4qVeUYjxoOeTSBURjGQbBv7qDxfECZUom5eUFlWZstmRSI0UuSQcWgJ52lkCglCkJAXKaqQebJn17gqIwsDRBgGG0FheCKLAwmkDKEVWlpeaChQSV6X5AXGUFWDVfA9kNc5rktW1N7zE22VDNxMXzBqpCBv+RhAA
[gist_rs]: https://gist.github.com/hurryabit/972be7d92fa7359ebb068b29d9e95a3b
[gist_py]: https://gist.github.com/hurryabit/a7213d9c8d059c31f51686bd66691592
[gist_js]: https://gist.github.com/hurryabit/76a59348e9f4445f82d93fa75cba2582
