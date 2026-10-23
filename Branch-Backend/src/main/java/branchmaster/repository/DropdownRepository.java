
package branchmaster.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class DropdownRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public <T> List<T> findAll(Class<T> entityClass) {
        String entityName = entityManager.getMetamodel()
                .entity(entityClass).getName();

        return entityManager.createQuery(
                "SELECT e FROM " + entityName + " e", entityClass
        ).getResultList();
    }
}
