# Product renders

Renders a studio image for every product in the database into `assets/products/<id>.webp` (600×750).
`render.html` builds each piece procedurally (perfume flacons, lipstick, folded clothing, bags, wallets, belts, jewellery, watches, caps, beanies); sneakers and sunglasses use CC BY 4.0 models from the Khronos glTF Sample Assets. Each product's render parameters (kind, colour, shape) come from `server/catalog/build.mjs`.

```bash
npm i                                    # playwright
npm run render                           # only products without an image
npm run render -- --force                # everything (~5 minutes for 1,200)
npm run render -- nike-kobe-6-protro-grinch moncler-maya-short-down-jacket-black
```

It drives the installed Microsoft Edge (`PW_CHANNEL=chrome` to use Chrome instead). A real photo uploaded in the admin panel always replaces the render on the site.
