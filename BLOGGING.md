# Publishing articles

The strongest search setup is to make the personal site the canonical source for new articles and use DEV as the distribution channel.

## Recommended sequence

1. Publish the complete article on this site with its own stable URL.
2. Add `BlogPosting` structured data, a useful title, a description, an author, and a publication date.
3. Add a canonical link that points to the article URL on this site.
4. Republish the article on DEV.
5. Add this field to the DEV front matter:

```yaml
canonical_url: https://sergei-parfenov.com/blog/article-slug/
```

6. Keep a visible link to the DEV discussion from the local article when the comments there add value.

## Existing DEV articles

Existing articles should keep DEV as their original source. The writing hub links to those originals and does not duplicate the full text.

## Before publishing

- Use one descriptive URL and do not change it after publication.
- Cite primary sources inside the article.
- Add descriptive alt text to meaningful images.
- Keep the title and author name consistent across both copies.
- Test the canonical tag in the built HTML, not only in the source template.
