CREATE TABLE councilterm (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    from_block BIGINT UNSIGNED,
    FOREIGN KEY (from_block) REFERENCES block(id),
    chain_id INT(11) UNSIGNED,
    FOREIGN KEY (chain_id) REFERENCES chain(id)
)