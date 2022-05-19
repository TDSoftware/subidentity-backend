CREATE TABLE identity (
    id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    account_id INT(11) UNSIGNED NOT NULL UNIQUE,
    FOREIGN KEY(account_id) REFERENCES account(id),
    active BOOL DEFAULT false,
    display VARCHAR(255),
    legal VARCHAR(255),
    address VARCHAR(255),
    riot VARCHAR(255),
    twitter VARCHAR(255),
    web VARCHAR(255),
    email VARCHAR(255)
)