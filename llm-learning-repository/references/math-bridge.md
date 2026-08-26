# Mathematics bridge for LLM research

Use this as a just-in-time bridge, not a prerequisite wall.

## Linear algebra

- **Scalar, vector, matrix, tensor:** one number, a list, a table, and a multi-axis table. A token embedding is a vector; a batch of sequences is a tensor.
- **Dot product** $q\\cdot k=\\sum_i q_i k_i$: a compatibility score. Attention uses it to estimate how much one token should listen to another.
- **Matrix multiplication:** many dot products arranged efficiently. Check inner dimensions first: $(n\\times d)(d\\times m)=(n\\times m)$.
- **Basis and rank:** rank describes the number of independent directions. LoRA assumes useful task updates often live in a lower-dimensional subspace.
- **Norm:** vector magnitude. Norms support normalization, regularization, similarity, and stability analysis.

Practice: work through 3Blue1Brown's *Essence of Linear Algebra*, then implement a 2-by-2 matrix multiplication and cosine similarity by hand.

## Probability and information

- A language model returns $p_\\theta(y_t\\mid y_{<t},x)$, a distribution for the next token.
- **Log likelihood** turns products of probabilities into sums; training usually minimizes negative log likelihood.
- **Cross-entropy** penalizes probability assigned away from the observed token. **Perplexity** is exponentiated average cross-entropy; compare it only under compatible tokenization/data.
- **Expectation** is a probability-weighted average. **Variance** measures spread. A reported mean without uncertainty can conceal unstable results.
- **Bayes' rule** helps separate prior beliefs from evidence; causal conclusions require more than predictive association.

## Calculus and optimization

- A derivative is local sensitivity; a gradient collects derivatives for all parameters.
- Backpropagation applies the chain rule through the computation graph.
- Gradient descent updates $\\theta \\leftarrow \\theta-\\eta\\nabla_\\theta L$; the learning rate $\\eta$ controls step size.
- Regularization, validation data, and early stopping help manage overfitting but do not fix biased data.

## Statistics and evaluation

Define the unit of analysis, sampling process, estimand, and uncertainty interval. Paired comparisons are often more powerful because the same tasks are evaluated under both systems. Correct for repeated testing, report subgroup results carefully, and distinguish statistical significance from practical value.

For deeper study: Strang's *Introduction to Linear Algebra*; Blitzstein and Hwang's *Introduction to Probability*; Murphy's *Probabilistic Machine Learning*; Boyd and Vandenberghe's *Convex Optimization*; Pearl, Glymour, and Jewell's *The Book of Why*.
