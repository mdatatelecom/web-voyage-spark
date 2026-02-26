DROP VIEW IF EXISTS public.v_connection_details;
CREATE VIEW public.v_connection_details AS
SELECT c.id,
    c.connection_code,
    c.cable_type,
    c.cable_length_meters,
    c.cable_color,
    c.status,
    c.installed_at,
    c.notes,
    c.vlan_id,
    c.vlan_name,
    c.vlan_tagging,
    c.port_a_id,
    c.port_b_id,
    pa.name AS port_a_name,
    pb.name AS port_b_name,
    ea.id AS equipment_a_id,
    ea.name AS equipment_a_name,
    ea.type AS equipment_a_type,
    ea.manufacturer AS equipment_a_manufacturer,
    ea.model AS equipment_a_model,
    eb.id AS equipment_b_id,
    eb.name AS equipment_b_name,
    eb.type AS equipment_b_type,
    eb.manufacturer AS equipment_b_manufacturer,
    eb.model AS equipment_b_model,
    ra.id AS rack_a_id,
    ra.name AS rack_a_name,
    rb.id AS rack_b_id,
    rb.name AS rack_b_name
   FROM connections c
     LEFT JOIN ports pa ON c.port_a_id = pa.id
     LEFT JOIN ports pb ON c.port_b_id = pb.id
     LEFT JOIN equipment ea ON pa.equipment_id = ea.id
     LEFT JOIN equipment eb ON pb.equipment_id = eb.id
     LEFT JOIN racks ra ON ea.rack_id = ra.id
     LEFT JOIN racks rb ON eb.rack_id = rb.id;