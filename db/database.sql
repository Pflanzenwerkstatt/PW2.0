\c template1;
DROP DATABASE IF EXISTS pflanzenwerkstatt;
CREATE DATABASE pflanzenwerkstatt;
\c pflanzenwerkstatt;

CREATE EXTENSION pgcrypto;

CREATE TABLE users (
    uid UUID UNIQUE DEFAULT gen_random_uuid(),
    uname VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    passwd VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    PRIMARY KEY (email)
);

CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

set timezone TO '1';
CREATE TABLE news (
    nid UUID DEFAULT gen_random_uuid(),
    title text NOT NULL,
    text text,
    ndate text DEFAULT current_date,
    ntime text DEFAULT current_time,
    PRIMARY KEY (nid)
);

CREATE TABLE experiment (
    eid UUID DEFAULT gen_random_uuid(),
    uid UUID NOT NULL,
    title text NOT NULL,
    text text,
    edate text DEFAULT current_date,
    etime text DEFAULT current_time,
    PRIMARY KEY (eid),
    FOREIGN KEY (uid)
        REFERENCES users (uid)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

DROP TABLE comment
CREATE TABLE comment (
    cid UUID DEFAULT gen_random_uuid(),
    uid UUID NOT NULL,
    eid UUID,
    parent UUID,
    text text,
    cdate text DEFAULT current_date,
    ctime text DEFAULT current_time,
    PRIMARY KEY (cid),
    FOREIGN KEY (eid)
        REFERENCES experiment (eid)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (uid)
        REFERENCES users (uid)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (parent)
        REFERENCES comment (cid)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
CREATE TABLE likes (
    cid UUID,
    uid UUID,
    PRIMARY KEY (cid, uid),
    FOREIGN KEY (uid)
        REFERENCES users (uid)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (cid)
        REFERENCES comment (cid)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


SELECT
    comment.cid,comment.parent,comment.text,comment.cdate,comment.ctime,
    users.uid,users.uname,
    count(likes.*) as "likes"
FROM comment
    JOIN users ON comment.uid = users.uid
    LEFT JOIN likes ON comment.cid = likes.cid
WHERE eid = '36ffa628-aaac-4728-b7cb-5a0f21020d2b'
GROUP BY
    comment.cid,
    users.uid,
    users.uname
ORDER BY
    comment.parent DESC,
    comment.cdate DESC,
    comment.ctime DESC;



SELECT comment.cid,comment.parent,comment.text,comment.cdate,comment.ctime,users.uid,users.uname,count(likes.*) as "clikes" FROM comment JOIN users ON comment.uid = users.uid LEFT JOIN likes ON comment.cid = likes.cid WHERE eid = '36ffa628-aaac-4728-b7cb-5a0f21020d2b' GROUP BY comment.cid,users.uid,users.uname ORDER BY comment.parent DESC,clikes DESC, comment.cdate DESC,comment.ctime DESC


    SELECT
        comment.cid,count(likes.*) as "likes"
    FROM comment
        JOIN users ON comment.uid = users.uid
        left JOIN likes ON comment.cid = likes.cid
    WHERE eid = '36ffa628-aaac-4728-b7cb-5a0f21020d2b'
    GROUP BY
        comment.cid
    ORDER BY
        comment.parent DESC,
        comment.cdate DESC,
        comment.ctime DESC;

UPDATE comment SET parent = 'f1023da2-96e1-4e70-9f59-c29b6c46fac9' WHERE cid = 'a107e9c1-820f-4cdb-ad66-6d95b2d3766a';

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM website;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM website;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM website;
REVOKE ALL ON DATABASE pflanzenwerkstatt FROM website;
DROP ROLE "website";

CREATE USER website WITH PASSWORD 'Pf14NZ3NW3RkS14T1';
GRANT ALL ON DATABASE pflanzenwerkstatt TO "website";
GRANT ALL ON ALL TABLES IN SCHEMA public TO website;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO website;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO website;

UPDATE users SET type = 'admin' WHERE email = 'ricwu@test.com';
