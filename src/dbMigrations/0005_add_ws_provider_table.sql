CREATE TABLE ws_provider (
    id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    address VARCHAR(255) UNIQUE NOT NULL,
    chain_id INT(11) UNSIGNED NOT NULL,
    FOREIGN KEY(chain_id) REFERENCES chain(id)
)