# Database Design

## Item

- ItemID (Primary Key)
- ItemName
- Description
- Price
- StartDate
- EndDate

## Purchase

- PurchaseID (Primary Key)
- CustomerID
- PurchaseDate
- Code

## Promotion

- PromotionID (Primary Key)
- ItemID (Foreign Key)
- StartDate
- EndDate
- DiscountPrice

## Bundle

- BundleID (Primary Key)
- BundleName
- BundleDescription
- BundlePrice

### Sequelize Model

```javascript
const Item = sequelize.define("Item", {
  ItemID: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  ItemName: Sequelize.STRING,
  Description: Sequelize.STRING,
  Price: Sequelize.FLOAT,
  StartDate: Sequelize.DATE,
  EndDate: Sequelize.DATE,
});

const Purchase = sequelize.define("Purchase", {
  PurchaseID: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  CustomerID: Sequelize.INTEGER,
  PurchaseDate: Sequelize.DATE,
  Code: Sequelize.STRING,
});

const Promotion = sequelize.define("Promotion", {
  PromotionID: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  StartDate: Sequelize.DATE,
  EndDate: Sequelize.DATE,
  DiscountPrice: Sequelize.FLOAT,
});

const Bundle = sequelize.define("Bundle", {
  BundleID: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  BundleName: Sequelize.STRING,
  BundleDescription: Sequelize.STRING,
  BundlePrice: Sequelize.FLOAT,
});

Item.hasMany(Purchase);
Purchase.belongsTo(Item);

Item.hasMany(Promotion);
Promotion.belongsTo(Item);
```
